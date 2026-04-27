import { createHash } from "node:crypto";

import type { ServerContext } from "@/lib/api-helpers/server-context";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { imageToEmbedding } from "@/async/ai/image-embedding";
import { setPayload } from "@/lib/api-helpers/server-context";
import { MULTIMODAL_EMBEDDING_MODEL_VERSION } from "@/utils/constants";

/**
 * Vertex AI embedding step. Called by both the AI-enrichment pgmq worker
 * (Raindrop / Instagram / Twitter imports + retries) and the screenshot
 * route (standard manual bookmark adds), so we only have one place that
 * knows how to call Vertex, claim a slot, and write the row.
 *
 * Errors are observability-only: callers run this AFTER the meta_data
 * update has committed, so an embedding miss never fails the surrounding
 * operation. Idempotency is guaranteed by claim_embedding_slot — replays /
 * concurrent workers see "already-current" and skip the Vertex call.
 *
 * Caller contract:
 *   - bookmarkId / userId / ogImage are persisted (the row exists in
 *     public.everything with an ogImage column).
 *   - supabase is a service-role client (worker-side; bypasses RLS).
 *   - ctx is the per-request observability context, used for setPayload only.
 */

interface ClaimResult {
  claimed: boolean;
  reason?: string;
}

const isClaimResult = (value: unknown): value is ClaimResult =>
  typeof value === "object" &&
  value !== null &&
  "claimed" in value &&
  typeof (value as { claimed: unknown }).claimed === "boolean";

// pgvector wire format for halfvec(N) inserts: "[v1,v2,...,vN]" string.
const formatHalfvec = (embedding: number[]): string => `[${embedding.join(",")}]`;

export const runEmbeddingPipeline = async ({
  bookmarkId,
  ctx,
  ogImage,
  supabase,
  userId,
}: {
  bookmarkId: number;
  ctx: ServerContext | undefined;
  ogImage: string;
  supabase: SupabaseClient<Database>;
  userId: string;
}): Promise<void> => {
  const sourceUrlHash = createHash("sha256").update(ogImage).digest("hex");

  const { data: claimData, error: claimError } = await supabase.rpc("claim_embedding_slot", {
    p_bookmark_id: bookmarkId,
    p_source_url_hash: sourceUrlHash,
    p_user_id: userId,
  });

  if (claimError) {
    setPayload(ctx, { embedding_claim_error: claimError.message });
    return;
  }
  if (!isClaimResult(claimData) || !claimData.claimed) {
    setPayload(ctx, {
      embedding_skipped: isClaimResult(claimData)
        ? (claimData.reason ?? "no-claim")
        : "invalid-response",
    });
    return;
  }

  const embeddingsTable = supabase.from("bookmark_embeddings");

  try {
    const { embedding, norm } = await imageToEmbedding(ogImage);

    const { error: writeError } = await embeddingsTable
      .update({
        embedding: formatHalfvec(embedding),
        model_version: MULTIMODAL_EMBEDDING_MODEL_VERSION,
        updated_at: new Date().toISOString(),
      })
      .eq("bookmark_id", bookmarkId);

    if (writeError) {
      await embeddingsTable.delete().eq("bookmark_id", bookmarkId);
      setPayload(ctx, { embedding_write_error: writeError.message });
      return;
    }

    setPayload(ctx, { embedding_written: true, embedding_norm: norm });
  } catch (error) {
    await embeddingsTable.delete().eq("bookmark_id", bookmarkId);
    setPayload(ctx, {
      embedding_failed: error instanceof Error ? error.message : String(error),
    });
  }
};
