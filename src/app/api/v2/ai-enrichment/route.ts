import { NextResponse } from "next/server";

import { createAxiomRouteHandler, withRawBody } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { storeQueueError } from "@/lib/api-helpers/queue";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { uploadImageToR2 } from "@/lib/bookmarks/add-remaining-bookmark-data";
import { createServerServiceClient } from "@/lib/supabase/service";
import { autoAssignCollections } from "@/utils/auto-assign-collections";
import { IMAGE_DOWNLOAD_TIMEOUT_MS, MAIN_TABLE_NAME } from "@/utils/constants";
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
          const imageResponse = await fetch(ogImage, {
            headers: {
              Accept: "image/*,*/*;q=0.8",
              "User-Agent": "Mozilla/5.0",
            },
            signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
          });

          if (!imageResponse.ok) {
            throw new Error(`HTTP error! status: ${imageResponse.status}`);
          }

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
