import * as Sentry from "@sentry/nextjs";

import { createRawPostHandler } from "@/lib/api-helpers/create-handler";
import { storeQueueError } from "@/lib/api-helpers/queue";
import { apiError, apiSuccess, apiWarn } from "@/lib/api-helpers/response";
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

export const POST = createRawPostHandler({
  handler: async ({ request, route }) => {
    // Stage 1: Parse raw body (may throw on malformed JSON)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      await storeQueueError({
        errorReason: "ai_enrichment: malformed_json",
        msgId: undefined,
        queueName: undefined,
        route,
      });
      return apiWarn({
        message: "Invalid JSON in request body",
        route,
        status: 400,
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
      return apiWarn({
        context: { errors: parsed.error.issues },
        message: "Invalid input",
        route,
        status: 400,
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

    // Twitter URL validation
    if (isTwitterBookmark) {
      try {
        validateTwitterMediaUrl(ogImageUrl);

        if (message.message.meta_data.video_url) {
          validateTwitterMediaUrl(message.message.meta_data.video_url);
        }
      } catch (validationError) {
        console.error(`[${route}] Twitter URL validation failed:`, {
          error: validationError,
          ogImageUrl,
          videoUrl: message.message.meta_data.video_url,
        });
        Sentry.captureException(validationError, {
          extra: {
            bookmarkId: id,
            ogImageUrl,
            url,
            videoUrl: message.message.meta_data.video_url,
          },
          tags: {
            operation: "url_validation_failed",
            userId: user_id,
          },
        });
        await storeQueueError({
          errorReason: "ai_enrichment: twitter_url_validation_failed",
          msgId: message.msg_id,
          queueName: queue_name,
          route,
        });
        return apiWarn({
          context: { bookmarkId: id, url },
          message:
            validationError instanceof Error ? validationError.message : "URL validation failed",
          route,
          status: 400,
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
        console.error(`[${route}] Instagram URL validation failed:`, {
          error: validationError,
          ogImageUrl,
          videoUrl: message.message.meta_data.video_url,
        });
        Sentry.captureException(validationError, {
          extra: {
            bookmarkId: id,
            ogImageUrl,
            url,
            videoUrl: message.message.meta_data.video_url,
          },
          tags: {
            operation: "instagram_url_validation_failed",
            userId: user_id,
          },
        });
        await storeQueueError({
          errorReason: "ai_enrichment: instagram_url_validation_failed",
          msgId: message.msg_id,
          queueName: queue_name,
          route,
        });
        return apiWarn({
          context: { bookmarkId: id, url },
          message:
            validationError instanceof Error
              ? validationError.message
              : "Instagram URL validation failed",
          route,
          status: 400,
        });
      }
    }

    console.log(`[${route}] Processing AI enrichment:`, {
      bookmarkId: id,
      isInstagramBookmark,
      isRaindropBookmark,
      isTwitterBookmark,
      messageId: message.msg_id,
      queueName: queue_name,
      url,
      userId: user_id,
    });

    const supabase = createServerServiceClient();
    let ogImage = ogImageUrl;

    // Raindrop/Instagram image re-upload to R2
    if (isRaindropBookmark || isInstagramBookmark) {
      console.log(
        `[${route}] Uploading ${isRaindropBookmark ? "Raindrop" : "Instagram"} image to R2:`,
        { url },
      );
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

        console.log(
          `[${route}] ${isRaindropBookmark ? "Raindrop" : "Instagram"} image uploaded successfully`,
        );
      } catch (error) {
        console.error(
          `[${route}] Error downloading ${isRaindropBookmark ? "Raindrop" : "Instagram"} image:`,
          error,
        );
        Sentry.captureException(error, {
          extra: { bookmarkId: id, ogImageUrl, url },
          tags: {
            operation: isRaindropBookmark ? "raindrop_image_upload" : "instagram_image_upload",
            userId: user_id,
          },
        });
      }
    }

    console.log(`[${route}] Starting metadata enrichment:`, { url });

    // Fetch title and description from DB for contextual AI summary
    const { data: bookmarkRow, error: fetchError } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("title, description, type")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.warn(`[${route}] Failed to fetch bookmark context:`, {
        bookmarkId: id,
        error: fetchError.message,
      });
      Sentry.captureException(fetchError, {
        extra: { bookmarkId: id },
        tags: { operation: "fetch_bookmark_context", userId: user_id },
      });
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

    if (isFailed) {
      console.warn(`[${route}] Metadata enrichment partially failed:`, { url });
    } else {
      console.log(`[${route}] Metadata enrichment completed successfully:`, { url });
    }

    // Update database with enriched data
    const { error: updateError } = await supabase
      .from(MAIN_TABLE_NAME)
      .update({ meta_data: toJson(newMeta), ogImage })
      .eq("id", id);

    if (updateError) {
      console.error(`[${route}] Error updating bookmark:`, updateError);
      Sentry.captureException(updateError, {
        extra: { bookmarkId: id, ogImage, url },
        tags: { operation: "update_bookmark_metadata", userId: user_id },
      });
      await storeQueueError({
        errorReason: "ai_enrichment: db_update_failed",
        msgId: message.msg_id,
        queueName: queue_name,
        route,
      });
      return apiError({
        error: updateError,
        message: "Failed to update bookmark metadata",
        operation: "update_bookmark_metadata",
        route,
        userId: user_id,
      });
    }

    console.log(`[${route}] Bookmark updated successfully:`, { url });

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
        console.error(`[${route}] Error deleting message from queue:`, {
          error: deleteError,
          messageId: message.msg_id,
          queueName: queue_name,
        });
        Sentry.captureException(deleteError, {
          extra: {
            bookmarkId: id,
            messageId: message.msg_id,
            queueName: queue_name,
            url,
          },
          tags: { operation: "delete_queue_message", userId: user_id },
        });
      } else {
        console.log(`[${route}] Queue message deleted:`, { messageId: message.msg_id });
      }
    } else {
      if (enrichError) {
        const { error: rpcError } = await supabase.rpc("update_queue_message_error", {
          p_error: `ai_enrichment: ${enrichError}`,
          p_msg_id: message.msg_id,
          p_queue_name: queue_name,
        });

        if (rpcError) {
          console.error(`[${route}] Failed to store error on queue message:`, {
            messageId: message.msg_id,
            queueName: queue_name,
            rpcError,
          });
        }
      }

      console.warn(`[${route}] Keeping message in queue due to failures:`, {
        error: enrichError,
        messageId: message.msg_id,
        url,
      });
    }

    console.log(`[${route}] Request completed:`, {
      isFailed,
      success: true,
      url,
    });

    return apiSuccess({
      data: { message: "AI enrichment completed" },
      route,
      schema: AiEnrichmentOutputSchema,
    });
  },
  inputSchema: AiEnrichmentInputSchema,
  outputSchema: AiEnrichmentOutputSchema,
  route: ROUTE,
});
