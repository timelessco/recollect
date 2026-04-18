import type { RealtimeChannel } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";

import { clientLogger } from "@/lib/api-helpers/axiom-client";
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
const LOG_OPERATION = "realtime_bookmark_subscribe";

const active = new Map<number, SubscriptionRecord>();
const waiting: OpenArgs[] = [];

function logEvent(message: string, bookmarkId: number, extra?: Record<string, unknown>): void {
  clientLogger.info(`[realtime-bookmark] ${message}`, {
    bookmarkId,
    operation: LOG_OPERATION,
    ...extra,
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
    logEvent("queued for channel slot", args.bookmarkId, {
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

  logEvent("opened", args.bookmarkId, { activeCount: active.size });
}

function handleStatus(args: OpenArgs, status: string): void {
  logEvent(`status: ${status}`, args.bookmarkId);

  if (status === "SUBSCRIBED") {
    void runCatchUpFetch(args);
    return;
  }
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    clientLogger.error("[realtime-bookmark] channel error", {
      bookmarkId: args.bookmarkId,
      operation: LOG_OPERATION,
      status,
      user_id: args.userId,
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
    clientLogger.error("[realtime-bookmark] catch-up fetch failed", {
      bookmarkId: args.bookmarkId,
      error_message: error.message,
      operation: LOG_OPERATION,
      phase: "catch_up_fetch",
      user_id: args.userId,
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
  logEvent("catch-up applied", args.bookmarkId);

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
    clientLogger.warn("[realtime-bookmark] payload parse failed", {
      bookmarkId: args.bookmarkId,
      operation: LOG_OPERATION,
      user_id: args.userId,
    });
    return;
  }

  const updated = spliceBookmarkAcrossCaches(args.queryClient, args.userId, parsed);
  logEvent("event applied", args.bookmarkId, { cachesUpdated: updated });

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
    // The id may still be sitting in waiting[] from a burst (>5 adds). Drop it
    // so promoteQueuedSubscription() can't later open a dead channel for a
    // bookmark whose screenshot pipeline already failed (would hold a slot
    // for the full 90s timeout and starve later adds).
    const queuedIndex = waiting.findIndex((queued) => queued.bookmarkId === bookmarkId);
    if (queuedIndex !== -1) {
      waiting.splice(queuedIndex, 1);
      logEvent("dequeued before subscribe", bookmarkId, { reason });
    }
    return;
  }
  record.tornDown = true;
  clearTimeout(record.timeoutHandle);
  active.delete(bookmarkId);

  const supabase = createClient();
  try {
    await supabase.removeChannel(record.channel);
    logEvent("torn down", bookmarkId, { reason });
  } catch (error) {
    // removeChannel can reject (WebSocket already closed, reconnect storm,
    // auth-token refresh race). Without this catch the rejection unwinds
    // through every `void teardown(...)` call site as an unhandled promise
    // rejection and the queue drain below never runs — slot count drops but
    // waiting[] IDs become zombies until the next clean teardown.
    clientLogger.warn("[realtime-bookmark] removeChannel failed", {
      bookmarkId,
      error_message: error instanceof Error ? error.message : String(error),
      operation: LOG_OPERATION,
      reason,
      user_id: record.userId,
    });
  } finally {
    promoteQueuedSubscription();
  }
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
