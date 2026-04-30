/**
 * @deprecated Use the v2 App Router endpoint instead: POST /api/v2/ai-enrichment
 * This Pages Router route will be removed after all consumers are migrated.
 */
import type { NextApiRequest, NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { storeQueueError } from "@/lib/api-helpers/queue";
import { autoAssignCollections } from "@/utils/auto-assign-collections";
import { resolveContentType } from "@/utils/resolve-content-type";

import { IMAGE_DOWNLOAD_TIMEOUT_MS, MAIN_TABLE_NAME } from "../../../utils/constants";
import {
  enrichMetadata,
  validateInstagramMediaUrl,
  validateTwitterMediaUrl,
} from "../../../utils/helpers.server";
import { createServiceClient } from "../../../utils/supabaseClient";
import { upload } from "../bookmark/add-remaining-bookmark-data";

const requestBodySchema = z.object({
  id: z.number(),
  isInstagramBookmark: z.boolean().default(false),
  isRaindropBookmark: z.boolean().default(false),
  isTwitterBookmark: z.boolean().default(false),
  message: z.object({
    message: z.object({
      meta_data: z.object({
        favIcon: z.string(),
        instagram_profile_pic: z.string().nullable().optional(),
        instagram_username: z.string().max(30).optional(),
        isOgImagePreferred: z.boolean().optional(),
        isPageScreenshot: z.boolean().nullable().optional(),
        saved_collection_names: z.array(z.string().max(255)).max(100).optional(),
        twitter_avatar_url: z.string().optional(),
        video_url: z.string().nullable().optional(),
      }),
    }),
    msg_id: z.number(),
  }),
  ogImage: z.url({ message: "ogImage must be a valid URL" }),
  queue_name: z.string().min(1, { message: "queue_name is required" }),
  url: z.url({ message: "url must be a valid URL" }),
  user_id: z.uuid({ message: "user_id must be a valid UUID" }),
});

const ROUTE = "ai-enrichment";

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "POST") {
    console.warn(`[${ROUTE}] Method not allowed:`, { method: request.method });
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Extract queue info early for error tracking (before full validation)
  const queueName = request.body?.queue_name as string | undefined;
  const msgId: number | undefined =
    typeof request.body?.message?.msg_id === "number" ? request.body.message.msg_id : undefined;

  try {
    const parseResult = requestBodySchema.safeParse(request.body);

    if (!parseResult.success) {
      console.warn(`[${ROUTE}] Validation error:`, parseResult.error.issues);
      await storeQueueError({
        errorReason: "ai_enrichment: validation_failed",
        msgId,
        queueName,
        route: ROUTE,
      });
      response.status(400).json({
        error: "Validation failed",
      });
      return;
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
    } = parseResult.data;

    if (isTwitterBookmark) {
      try {
        // Validate ogImage URL
        validateTwitterMediaUrl(ogImageUrl);
        console.log(`[${ROUTE}] ogImage URL validated:`, { ogImageUrl });

        // Validate video URL if present
        if (message.message.meta_data?.video_url) {
          validateTwitterMediaUrl(message.message.meta_data.video_url);
          console.log(`[${ROUTE}] Video URL validated`);
        }
      } catch (validationError) {
        console.error(`[${ROUTE}] URL validation failed:`, {
          error: validationError,
          ogImageUrl,
          videoUrl: message.message.meta_data?.video_url,
        });
        Sentry.captureException(validationError, {
          extra: {
            bookmarkId: id,
            ogImageUrl,
            url,
            videoUrl: message.message.meta_data?.video_url,
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
          route: ROUTE,
        });
        response.status(400).json({
          error:
            validationError instanceof Error ? validationError.message : "URL validation failed",
        });
        return;
      }
    }

    if (isInstagramBookmark) {
      try {
        // Validate ogImage URL
        validateInstagramMediaUrl(ogImageUrl);
        console.log(`[${ROUTE}] Instagram ogImage URL validated:`, {
          ogImageUrl,
        });

        // Validate video URL if present
        if (message.message.meta_data?.video_url) {
          validateInstagramMediaUrl(message.message.meta_data.video_url);
          console.log(`[${ROUTE}] Instagram video URL validated`);
        }
      } catch (validationError) {
        console.error(`[${ROUTE}] Instagram URL validation failed:`, {
          error: validationError,
          ogImageUrl,
          videoUrl: message.message.meta_data?.video_url,
        });
        Sentry.captureException(validationError, {
          extra: {
            bookmarkId: id,
            ogImageUrl,
            url,
            videoUrl: message.message.meta_data?.video_url,
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
          route: ROUTE,
        });
        response.status(400).json({
          error:
            validationError instanceof Error
              ? validationError.message
              : "Instagram URL validation failed",
        });
        return;
      }
    }

    console.log(`[${ROUTE}] API called:`, {
      bookmarkId: id,
      isInstagramBookmark,
      isRaindropBookmark,
      isTwitterBookmark,
      messageId: message.msg_id,
      queueName: queue_name,
      url,
      userId: user_id,
    });

    const supabase = createServiceClient();
    let ogImage = ogImageUrl;

    // If from Raindrop bookmark — upload ogImage into R2
    if (isRaindropBookmark || isInstagramBookmark || isTwitterBookmark) {
      let sourceLabel: "Raindrop" | "Instagram" | "Twitter";
      if (isRaindropBookmark) {
        sourceLabel = "Raindrop";
      } else if (isInstagramBookmark) {
        sourceLabel = "Instagram";
      } else {
        sourceLabel = "Twitter";
      }
      const sourceOperation = `${sourceLabel.toLowerCase()}_image_upload` as const;

      console.log(`[${ROUTE}] Uploading ${sourceLabel} image to R2:`, { url });
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
        ogImage = (await upload(returnedB64, user_id, null)) ?? ogImageUrl;

        console.log(`[${ROUTE}] ${sourceLabel} image uploaded successfully`);
      } catch (error) {
        console.error(`[${ROUTE}] Error downloading ${sourceLabel} image:`, error);
        Sentry.captureException(error, {
          extra: {
            bookmarkId: id,
            ogImageUrl,
            url,
          },
          tags: {
            operation: sourceOperation,
            userId: user_id,
          },
        });
      }
    }

    console.log(`[${ROUTE}] Starting metadata enrichment:`, { url });

    // Fetch title and description from DB for contextual AI summary
    const { data: bookmarkRow, error: fetchError } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("title, description, type")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.warn(`[${ROUTE}] Failed to fetch bookmark context:`, {
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
      error,
      isFailed,
      matchedCollectionIds,
      metadata: newMeta,
    } = await enrichMetadata({
      contentType,
      description: bookmarkRow?.description,
      existingMetadata: message.message.meta_data,
      isInstagramBookmark,
      isOgImage:
        (message.message.meta_data?.isOgImagePreferred ?? false) ||
        message.message.meta_data?.isPageScreenshot !== true,
      isTwitterBookmark,
      ogImage,
      supabase,
      title: bookmarkRow?.title,
      url,
      userId: user_id,
      videoUrl: message.message.meta_data?.video_url,
    });

    if (isFailed) {
      console.warn(`[${ROUTE}] Metadata enrichment partially failed:`, { url });
    } else {
      console.log(`[${ROUTE}] Metadata enrichment completed successfully:`, {
        url,
      });
    }

    // Update database with enriched data
    const { error: updateError } = await supabase
      .from(MAIN_TABLE_NAME)
      .update({ meta_data: newMeta, ogImage })
      .eq("id", id);

    if (updateError) {
      console.error(`[${ROUTE}] Error updating bookmark:`, updateError);
      Sentry.captureException(updateError, {
        extra: {
          bookmarkId: id,
          ogImage,
          url,
        },
        tags: {
          operation: "update_bookmark_metadata",
          userId: user_id,
        },
      });
      await storeQueueError({
        errorReason: "ai_enrichment: db_update_failed",
        msgId: message.msg_id,
        queueName: queue_name,
        route: ROUTE,
      });
      response.status(500).json({
        error: "Failed to update bookmark metadata",
      });
      return;
    }

    console.log(`[${ROUTE}] Bookmark updated successfully:`, { url });

    await autoAssignCollections({
      bookmarkId: id,
      matchedCollectionIds,
      route: ROUTE,
      userId: user_id,
    });

    // Delete message from queue on success
    if (!isFailed) {
      const { error: deleteError } = await supabase.schema("pgmq_public").rpc("delete", {
        message_id: message.msg_id,
        queue_name,
      });

      if (deleteError) {
        console.error(`[${ROUTE}] Error deleting message from queue:`, {
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
          tags: {
            operation: "delete_queue_message",
            userId: user_id,
          },
        });
      } else {
        console.log(`[${ROUTE}] Queue message deleted:`, {
          messageId: message.msg_id,
        });
      }
    } else {
      if (error) {
        const { error: rpcError } = await supabase.rpc("update_queue_message_error", {
          p_error: `ai_enrichment: ${error}`,
          p_msg_id: message.msg_id,
          p_queue_name: queue_name,
        });

        if (rpcError) {
          console.error(`[${ROUTE}] Failed to store error on queue message:`, {
            messageId: message.msg_id,
            queueName: queue_name,
            rpcError,
          });
        }
      }

      console.warn(`[${ROUTE}] Keeping message in queue due to failures:`, {
        error,
        messageId: message.msg_id,
        url,
      });
    }

    console.log(`[${ROUTE}] Request completed:`, {
      isFailed,
      success: true,
      url,
    });

    response.status(200).json({
      error,
      isFailed,
      meta_data: newMeta,
      ogImage,
      success: true,
    });
  } catch (error) {
    console.error(`[${ROUTE}] Unexpected error:`, error);
    Sentry.captureException(error, {
      extra: {
        bookmarkId: request.body?.id,
        url: request.body?.url,
        userId: request.body?.user_id,
      },
      tags: {
        operation: "ai_enrichment_unexpected",
      },
    });
    await storeQueueError({
      errorReason: "ai_enrichment: unexpected_error",
      msgId,
      queueName,
      route: ROUTE,
    });
    response.status(500).json({
      error: "An unexpected error occurred",
    });
  }
}
