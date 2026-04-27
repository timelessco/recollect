import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import ky from "ky";

import type { ServerContext } from "@/lib/api-helpers/server-context";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { imageToEmbedding } from "@/async/ai/image-embedding";
import { env } from "@/env/server";
import { createAxiomRouteHandler, withRawBody } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { storeQueueError } from "@/lib/api-helpers/queue";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { uploadImageToR2 } from "@/lib/bookmarks/add-remaining-bookmark-data";
import { createServerServiceClient } from "@/lib/supabase/service";
import { autoAssignCollections } from "@/utils/auto-assign-collections";
import {
  IMAGE_DOWNLOAD_TIMEOUT_MS,
  MAIN_TABLE_NAME,
  MULTIMODAL_EMBEDDING_MODEL_VERSION,
} from "@/utils/constants";
import {
  enrichMetadata,
  validateInstagramMediaUrl,
  validateTwitterMediaUrl,
} from "@/utils/helpers.server";
import { resolveContentType } from "@/utils/resolve-content-type";
import { toJson } from "@/utils/type-utils";

import { AiEnrichmentInputSchema, AiEnrichmentOutputSchema } from "./schema";

const ROUTE = "v2-ai-enrichment";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// pgvector wire format for halfvec(N) inserts: "[v1,v2,...,vN]" string.
const formatHalfvec = (embedding: number[]): string => `[${embedding.join(",")}]`;

// Type-erased Supabase facade for objects added by migration 20260427124701
// that are not yet in `database-generated.types.ts`. Once `pnpm db:reset &&
// pnpm db:types` runs locally post-merge, the unsafe casts below collapse to
// no-ops and this whole block can be inlined. Until then, this is the only
// place in the codebase that knows the new RPC + table exist.
//
// oxlint-disable @typescript-eslint/no-unsafe-type-assertion -- centralized type boundary
interface ClaimResult {
  claimed: boolean;
  reason?: string;
}
type RpcCall = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;
type FromCall = (table: string) => {
  delete: () => {
    eq: (col: string, value: unknown) => Promise<{ error: { message: string } | null }>;
  };
  update: (values: Record<string, unknown>) => {
    eq: (col: string, value: unknown) => Promise<{ error: { message: string } | null }>;
  };
};

// Embedding pipeline lives behind the EMBEDDINGS_ENABLED kill switch.
// Errors here are observability-only: the metadata update has already
// committed and we never fail the queue message because of an embedding miss.
// Idempotency is guaranteed by claim_embedding_slot — replays / concurrent
// workers see "already-current" and skip the Vertex call entirely.
const runEmbeddingPipeline = async ({
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
  const rpc = supabase.rpc.bind(supabase) as unknown as RpcCall;

  const claim = await rpc("claim_embedding_slot", {
    p_bookmark_id: bookmarkId,
    p_source_url_hash: sourceUrlHash,
    p_user_id: userId,
  });

  if (claim.error) {
    setPayload(ctx, { embedding_claim_error: claim.error.message });
    return;
  }
  const claimResult = claim.data as ClaimResult | null;
  if (!claimResult?.claimed) {
    setPayload(ctx, {
      embedding_skipped: claimResult?.reason ?? "no-claim",
    });
    return;
  }

  const embeddingsTable = (supabase.from as unknown as FromCall)("bookmark_embeddings");

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
// oxlint-enable @typescript-eslint/no-unsafe-type-assertion

export const POST = createAxiomRouteHandler(
  withRawBody({
    handler: async ({ request, route }) => {
      const ctx = getServerContext();

      // Stage 1: Parse raw body (may throw on malformed JSON)
      let body: unknown;
      try {
        body = await request.json();
      } catch (error) {
        await storeQueueError({
          errorReason: "ai_enrichment: malformed_json",
          msgId: undefined,
          queueName: undefined,
          route,
        });
        throw new RecollectApiError("bad_request", {
          cause: error,
          message: "Invalid JSON in request body",
        });
      }

      // Stage 2: Extract queue identifiers before full validation
      const rawQueueName =
        isRecord(body) && typeof body.queue_name === "string" ? body.queue_name : undefined;
      const rawMsgObj = isRecord(body) && isRecord(body.message) ? body.message : undefined;
      const rawMsgId: number | undefined =
        typeof rawMsgObj?.msg_id === "number" ? rawMsgObj.msg_id : undefined;

      // Stage 3: Full Zod validation
      const parsed = AiEnrichmentInputSchema.safeParse(body);
      if (!parsed.success) {
        await storeQueueError({
          errorReason: "ai_enrichment: validation_failed",
          msgId: rawMsgId,
          queueName: rawQueueName,
          route,
        });
        throw new RecollectApiError("bad_request", {
          message: "Invalid input",
          context: { errors: parsed.error.issues },
        });
      }

      const {
        id,
        isInstagramBookmark,
        isRaindropBookmark,
        isTwitterBookmark,
        message,
        ogImage: ogImageUrl,
        queue_name,
        url,
        user_id,
      } = parsed.data;

      if (ctx?.fields) {
        ctx.fields.user_id = user_id;
        ctx.fields.msg_id = message.msg_id;
        ctx.fields.bookmark_id = id;
      }
      setPayload(ctx, {
        queue_name,
        url,
        is_twitter: isTwitterBookmark ?? false,
        is_instagram: isInstagramBookmark ?? false,
        is_raindrop: isRaindropBookmark ?? false,
      });

      // Twitter URL validation
      if (isTwitterBookmark) {
        try {
          validateTwitterMediaUrl(ogImageUrl);

          if (message.message.meta_data.video_url) {
            validateTwitterMediaUrl(message.message.meta_data.video_url);
          }
        } catch (validationError) {
          setPayload(ctx, {
            url_validation_error: "twitter",
            validation_message:
              validationError instanceof Error ? validationError.message : String(validationError),
          });
          await storeQueueError({
            errorReason: "ai_enrichment: twitter_url_validation_failed",
            msgId: message.msg_id,
            queueName: queue_name,
            route,
          });
          throw new RecollectApiError("bad_request", {
            message:
              validationError instanceof Error ? validationError.message : "URL validation failed",
          });
        }
      }

      // Instagram URL validation
      if (isInstagramBookmark) {
        try {
          validateInstagramMediaUrl(ogImageUrl);

          if (message.message.meta_data.video_url) {
            validateInstagramMediaUrl(message.message.meta_data.video_url);
          }
        } catch (validationError) {
          setPayload(ctx, {
            url_validation_error: "instagram",
            validation_message:
              validationError instanceof Error ? validationError.message : String(validationError),
          });
          await storeQueueError({
            errorReason: "ai_enrichment: instagram_url_validation_failed",
            msgId: message.msg_id,
            queueName: queue_name,
            route,
          });
          throw new RecollectApiError("bad_request", {
            message:
              validationError instanceof Error
                ? validationError.message
                : "Instagram URL validation failed",
          });
        }
      }

      const supabase = createServerServiceClient();
      let ogImage = ogImageUrl;

      // Raindrop/Instagram image re-upload to R2
      if (isRaindropBookmark || isInstagramBookmark) {
        const platform = isRaindropBookmark ? "raindrop" : "instagram";
        try {
          // `timeout: false` disables ky's 10s default headers-arrival timer;
          // the signal is the end-to-end wall-clock bound that also guards the
          // `.arrayBuffer()` body read below. Without this, a slow og-image
          // source would abort at 10s regardless of IMAGE_DOWNLOAD_TIMEOUT_MS.
          const imageResponse = await ky.get(ogImage, {
            headers: {
              Accept: "image/*,*/*;q=0.8",
              "User-Agent": "Mozilla/5.0",
            },
            retry: 0,
            timeout: false,
            signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
          });

          const arrayBuffer = await imageResponse.arrayBuffer();
          const returnedB64 = Buffer.from(arrayBuffer).toString("base64");
          ogImage = (await uploadImageToR2(returnedB64, user_id, null)) ?? ogImageUrl;

          setPayload(ctx, { image_reupload: platform });
        } catch (error) {
          setPayload(ctx, {
            image_reupload_error: platform,
            image_reupload_message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Fetch title and description from DB for contextual AI summary
      const { data: bookmarkRow, error: fetchError } = await supabase
        .from(MAIN_TABLE_NAME)
        .select("title, description, type")
        .eq("id", id)
        .single();

      if (fetchError) {
        setPayload(ctx, { fetch_context_error: fetchError.message });
      }

      const contentType = resolveContentType({
        mediaType: undefined,
        type: bookmarkRow?.type ?? undefined,
      });

      // Enrich metadata with AI-generated content
      const {
        error: enrichError,
        isFailed,
        matchedCollectionIds,
        metadata: newMeta,
      } = await enrichMetadata({
        contentType,
        description: bookmarkRow?.description,
        existingMetadata: message.message.meta_data,
        isInstagramBookmark,
        isOgImage:
          (message.message.meta_data.isOgImagePreferred ?? false) ||
          message.message.meta_data.isPageScreenshot !== true,
        isTwitterBookmark,
        ogImage,
        supabase,
        title: bookmarkRow?.title,
        url,
        userId: user_id,
        videoUrl: message.message.meta_data.video_url,
      });

      setPayload(ctx, { enrichment_failed: isFailed });

      // Update database with enriched data
      const { error: updateError } = await supabase
        .from(MAIN_TABLE_NAME)
        .update({ meta_data: toJson(newMeta), ogImage })
        .eq("id", id);

      if (updateError) {
        await storeQueueError({
          errorReason: "ai_enrichment: db_update_failed",
          msgId: message.msg_id,
          queueName: queue_name,
          route,
        });
        throw new RecollectApiError("service_unavailable", {
          cause: updateError,
          message: "Failed to update bookmark metadata",
          operation: "update_bookmark_metadata",
        });
      }

      await autoAssignCollections({
        bookmarkId: id,
        matchedCollectionIds,
        route,
        userId: user_id,
      });

      // Vertex AI multimodal embedding — gated by EMBEDDINGS_ENABLED flag.
      // Errors here are observability-only and never fail the queue message.
      if (env.EMBEDDINGS_ENABLED === "true" && ogImage) {
        try {
          await runEmbeddingPipeline({
            bookmarkId: id,
            ctx,
            ogImage,
            supabase,
            userId: user_id,
          });
        } catch (error) {
          setPayload(ctx, {
            embedding_unexpected_error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Queue lifecycle: delete on full success, store error + keep on partial failure
      if (!isFailed) {
        const { error: deleteError } = await supabase.schema("pgmq_public").rpc("delete", {
          message_id: message.msg_id,
          queue_name,
        });

        if (deleteError) {
          setPayload(ctx, { queue_delete_error: deleteError.message });
        }
      } else {
        if (enrichError) {
          const { error: rpcError } = await supabase.rpc("update_queue_message_error", {
            p_error: `ai_enrichment: ${enrichError}`,
            p_msg_id: message.msg_id,
            p_queue_name: queue_name,
          });

          if (rpcError) {
            setPayload(ctx, { store_error_rpc_error: rpcError.message });
          }
        }

        setPayload(ctx, { queue_kept: true, enrich_error: enrichError });
      }

      return NextResponse.json({ message: "AI enrichment completed" });
    },
    inputSchema: AiEnrichmentInputSchema,
    outputSchema: AiEnrichmentOutputSchema,
    route: ROUTE,
  }),
);
