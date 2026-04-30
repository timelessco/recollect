import { createHash } from "node:crypto";

import { z } from "zod";

import type { ServerContext } from "@/lib/api-helpers/server-context";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { imageToEmbedding } from "@/async/ai/image-embedding";
import { setPayload } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";

/**
 * Errors are observability-only — the caller's metadata commit has already
 * landed, so an embedding miss never fails the surrounding operation.
 * Idempotency is guaranteed by claim_embedding_slot: replays / concurrent
 * workers see "already-current" and skip the Gemini call.
 *
 * Writes to public.bookmark_embeddings always go through a service-role
 * client constructed internally — the table's RLS denies all DML for
 * authenticated/anon, and callers from user-auth routes (e.g. the manual
 * add flow) would otherwise have their UPDATE/DELETE silently no-op'd by
 * RLS, leaving claim_embedding_slot's placeholder row stuck at norm=0.
 * The caller's `supabase` is still used for the SECURITY DEFINER RPC call
 * so wide-event context propagates as expected.
 */

const ClaimResultSchema = z.object({
  claimed: z.boolean(),
  reason: z.string().optional(),
});

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
  const parsedClaim = ClaimResultSchema.safeParse(claimData);
  if (!parsedClaim.success) {
    setPayload(ctx, { embedding_skipped: "invalid-response" });
    return;
  }
  if (!parsedClaim.data.claimed) {
    setPayload(ctx, { embedding_skipped: parsedClaim.data.reason ?? "no-claim" });
    return;
  }

  const serviceClient = createServerServiceClient();
  const releaseClaim = () =>
    serviceClient.from("bookmark_embeddings").delete().eq("bookmark_id", bookmarkId);

  try {
    const { embedding, norm } = await imageToEmbedding(ogImage);

    const { error: writeError } = await serviceClient
      .from("bookmark_embeddings")
      .update({
        embedding: formatHalfvec(embedding),
        updated_at: new Date().toISOString(),
      })
      .eq("bookmark_id", bookmarkId);

    if (writeError) {
      await releaseClaim();
      setPayload(ctx, { embedding_write_error: writeError.message });
      return;
    }

    setPayload(ctx, { embedding_written: true, embedding_norm: norm });
  } catch (error) {
    await releaseClaim();
    setPayload(ctx, {
      embedding_failed: error instanceof Error ? error.message : String(error),
    });
  }
};
