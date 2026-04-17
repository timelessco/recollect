import * as Sentry from "@sentry/nextjs";

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

import { isRowTerminal, parseBookmarkRealtimePayload } from "./bookmark-realtime-payload";
import { spliceBookmarkAcrossCaches } from "./splice-bookmark-across-caches";

type TeardownReason =
  | "auth_error"
  | "channel_error"
  | "delete_event"
  | "screenshot_failed"
  | "terminal"
  | "timeout";

interface OpenArgs {
  bookmarkId: number;
  queryClient: QueryClient;
  userId: string;
}

interface SubscriptionRecord {
  bookmarkId: number;
  channel: RealtimeChannel;
  queryClient: QueryClient;
  timeoutHandle: ReturnType<typeof setTimeout>;
  tornDown: boolean;
  userId: string;
}

const MAX_CONCURRENT_CHANNELS = 5;
const TIMEOUT_MS = 90_000;
const SENTRY_CATEGORY = "realtime-bookmark";
const SENTRY_OPERATION = "realtime_bookmark_subscribe";

const active = new Map<number, SubscriptionRecord>();
const waiting: OpenArgs[] = [];

function breadcrumb(message: string, bookmarkId: number, extra?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    category: SENTRY_CATEGORY,
    data: { bookmarkId, ...extra },
    level: "info",
    message,
  });
}

/**
 * Open a Realtime subscription that watches a newly-added bookmark row for
 * enrichment-pipeline UPDATEs and DELETE. Idempotent per bookmark id.
 * Callers should only open for URLs that will trigger the screenshot mutation
 * (i.e., not image / audio / PDF media URLs) — media paths never reach the
 * terminal state and would always hit the 90s timeout.
 */
export function openBookmarkEnrichmentSubscription(args: OpenArgs): void {
  if (active.has(args.bookmarkId)) {
    return;
  }
  // Dedupe at enqueue: a second open() call for an id already in the queue
  // would otherwise push a duplicate entry, and promotion would later open
  // two channels for the same bookmark (overwriting the active record and
  // orphaning the first channel + its timeout).
  if (waiting.some((queued) => queued.bookmarkId === args.bookmarkId)) {
    return;
  }
  if (active.size >= MAX_CONCURRENT_CHANNELS) {
    waiting.push(args);
    breadcrumb("queued for channel slot", args.bookmarkId, {
      activeCount: active.size,
      waitingCount: waiting.length,
    });
    return;
  }
  openChannel(args);
}

function openChannel(args: OpenArgs): void {
  const supabase = createClient();
  const channelName = `bookmark-${args.bookmarkId}-${crypto.randomUUID()}`;
  const filter = `id=eq.${args.bookmarkId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "UPDATE", filter, schema: "public", table: "everything" },
      (payload) => {
        handleUpdate(args, payload.new);
      },
    )
    .on(
      "postgres_changes",
      { event: "DELETE", filter, schema: "public", table: "everything" },
      () => {
        void teardown(args.bookmarkId, "delete_event");
      },
    )
    .subscribe((status) => {
      handleStatus(args, status);
    });

  const timeoutHandle = setTimeout(() => {
    void teardown(args.bookmarkId, "timeout");
  }, TIMEOUT_MS);

  active.set(args.bookmarkId, {
    bookmarkId: args.bookmarkId,
    channel,
    queryClient: args.queryClient,
    timeoutHandle,
    tornDown: false,
    userId: args.userId,
  });

  breadcrumb("opened", args.bookmarkId, { activeCount: active.size });
}

function handleStatus(args: OpenArgs, status: string): void {
  breadcrumb(`status: ${status}`, args.bookmarkId);

  if (status === "SUBSCRIBED") {
    void runCatchUpFetch(args);
    return;
  }
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    Sentry.captureException(new Error(`Realtime channel status: ${status}`), {
      tags: { operation: SENTRY_OPERATION, userId: args.userId },
      extra: { bookmarkId: args.bookmarkId, status },
    });
    void teardown(args.bookmarkId, "channel_error");
  }
}

/**
 * Subscription lifecycle gate. Returns false once `teardown` has either set
 * `tornDown = true` (in-flight teardown) or removed the record from `active`
 * (teardown completed). Use before any cache mutation or terminal-state
 * teardown scheduling that runs after an await or via an event queued before
 * removeChannel resolved.
 */
function isSubscriptionAlive(bookmarkId: number): boolean {
  const record = active.get(bookmarkId);
  return record !== undefined && !record.tornDown;
}

async function runCatchUpFetch(args: OpenArgs): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("everything")
    .select("*")
    .eq("id", args.bookmarkId)
    .maybeSingle();

  // Bail if anything tore down the subscription during the network roundtrip
  // (delete event, screenshot mutation error, sign-out, 90s timeout).
  if (!isSubscriptionAlive(args.bookmarkId)) {
    return;
  }

  if (error) {
    Sentry.captureException(error, {
      tags: { operation: SENTRY_OPERATION, userId: args.userId },
      extra: { bookmarkId: args.bookmarkId, phase: "catch_up_fetch" },
    });
    return;
  }
  if (!data) {
    return;
  }

  const parsed = parseBookmarkRealtimePayload(data);
  if (!parsed) {
    return;
  }

  spliceBookmarkAcrossCaches(args.queryClient, args.userId, parsed);
  breadcrumb("catch-up applied", args.bookmarkId);

  if (isRowTerminal(parsed)) {
    void teardown(args.bookmarkId, "terminal");
  }
}

function handleUpdate(args: OpenArgs, payloadNew: unknown): void {
  // Guard against in-flight realtime events queued before removeChannel
  // resolved — supabase-js removeChannel is async, callbacks already in the
  // event loop can still fire after teardown was initiated.
  if (!isSubscriptionAlive(args.bookmarkId)) {
    return;
  }

  const parsed = parseBookmarkRealtimePayload(payloadNew);
  if (!parsed) {
    Sentry.captureException(new Error("Failed to parse Realtime payload"), {
      tags: { operation: SENTRY_OPERATION, userId: args.userId },
      extra: { bookmarkId: args.bookmarkId },
    });
    return;
  }

  const updated = spliceBookmarkAcrossCaches(args.queryClient, args.userId, parsed);
  breadcrumb("event applied", args.bookmarkId, { cachesUpdated: updated });

  if (isRowTerminal(parsed)) {
    void teardown(args.bookmarkId, "terminal");
  }
}

export async function teardownBookmarkEnrichmentSubscription(
  bookmarkId: number,
  reason: TeardownReason,
): Promise<void> {
  await teardown(bookmarkId, reason);
}

async function teardown(bookmarkId: number, reason: TeardownReason): Promise<void> {
  const record = active.get(bookmarkId);
  if (!record || record.tornDown) {
    return;
  }
  record.tornDown = true;
  clearTimeout(record.timeoutHandle);
  active.delete(bookmarkId);

  const supabase = createClient();
  await supabase.removeChannel(record.channel);

  breadcrumb("torn down", bookmarkId, { reason });

  promoteQueuedSubscription();
}

function promoteQueuedSubscription(): void {
  if (active.size >= MAX_CONCURRENT_CHANNELS) {
    return;
  }
  // Skip stale duplicates defensively — open() dedupes at enqueue time, but
  // belt-and-suspenders here prevents openChannel from overwriting a live
  // SubscriptionRecord (which would orphan the original channel + timeout).
  while (waiting.length > 0) {
    const next = waiting.shift();
    if (!next) {
      return;
    }
    if (active.has(next.bookmarkId)) {
      continue;
    }
    openChannel(next);
    return;
  }
}

export async function teardownAllBookmarkEnrichmentSubscriptions(
  reason: TeardownReason = "auth_error",
): Promise<void> {
  const ids = [...active.keys()];
  waiting.length = 0;
  await Promise.all(ids.map((id) => teardown(id, reason)));
}
