import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { RecollectApiError } from "@/lib/api-helpers/errors";
import { PROFILES } from "@/utils/constants";

export type NormalizedPlan = "free" | "plus" | "pro";

export interface FreeTierContext {
  freeTierCutoffAt: string;
  freeTierCutoffMs: number;
  isFree: boolean;
  plan: NormalizedPlan;
}

function normalizePlan(raw: unknown): NormalizedPlan {
  if (raw === "free" || raw === "plus" || raw === "pro") {
    return raw;
  }

  return "free";
}

/**
 * Fetches the user's plan + derives the free-tier import cutoff.
 *
 * `freeTierCutoffAt` equals `auth.users.created_at` — free-tier users may
 * only import bookmarks whose `saved_at` is >= this timestamp. Paid users
 * bypass the cutoff entirely (`isFree` = false).
 *
 * A missing profile row defaults to `plan: "free"` — safe default that
 * keeps the filter engaged for edge cases.
 */
export async function getFreeTierContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  userCreatedAt: string,
): Promise<FreeTierContext> {
  const { data, error } = await supabase
    .from(PROFILES)
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new RecollectApiError("service_unavailable", {
      cause: error,
      message: "Failed to resolve subscription plan",
      operation: "free_tier_context_fetch",
    });
  }

  const plan = normalizePlan(data?.plan);

  return {
    freeTierCutoffAt: userCreatedAt,
    freeTierCutoffMs: Date.parse(userCreatedAt),
    isFree: plan === "free",
    plan,
  };
}

/**
 * Partitions a batch against the free-tier cutoff. Items whose saved-at
 * timestamp is missing, unparsable, or strictly before the cutoff are
 * dropped; the rest pass through. For paid users, call sites should skip
 * invoking this helper entirely.
 */
export function partitionByCutoff<T>(
  items: readonly T[],
  getSavedAtIso: (item: T) => null | string | undefined,
  cutoffMs: number,
): { kept: T[]; skipped: number } {
  const kept: T[] = [];
  let skipped = 0;

  for (const item of items) {
    const iso = getSavedAtIso(item);
    if (!iso) {
      skipped += 1;
      continue;
    }

    const ms = Date.parse(iso);
    if (Number.isNaN(ms) || ms < cutoffMs) {
      skipped += 1;
      continue;
    }

    kept.push(item);
  }

  return { kept, skipped };
}
