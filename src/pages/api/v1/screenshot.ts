import type { NextApiRequest, NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { z } from "zod";

import { env } from "@/env/server";
import { storeQueueError } from "@/lib/api-helpers/queue";
import { upload } from "@/lib/storage/media-upload";
import { autoAssignCollections, fetchUserCollections } from "@/utils/auto-assign-collections";
import { resolveContentType } from "@/utils/resolve-content-type";

import { imageToText } from "../../../async/ai/image-analysis";
import { fetchAiToggles } from "../../../utils/ai-feature-toggles";
import { MAIN_TABLE_NAME, PDF_MIME_TYPE, SCREENSHOT_API } from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { createServiceClient } from "../../../utils/supabaseClient";

const ScreenshotPayloadSchema = z.object({
  id: z.union([z.string(), z.number()]),
  mediaType: z.string().nullable().optional(),
  message: z.object({
    msg_id: z.number(),
  }),
  queue_name: z.string(),
  url: z.url("Invalid URL format"),
  user_id: z.string().min(1, "user_id is required"),
});

type ScreenshotPayload = z.infer<typeof ScreenshotPayloadSchema>;

const ROUTE = "screenshot";

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Extract queue info early for error tracking (before full validation)
  const rawQueueName = request.body?.queue_name as string | undefined;
  const rawMsgId: number | undefined =
    typeof request.body?.message?.msg_id === "number" ? request.body.message.msg_id : undefined;

  const parsed = ScreenshotPayloadSchema.safeParse(request.body);
  if (!parsed.success) {
    const errors = z.treeifyError(parsed.error).properties;
    await storeQueueError({
      errorReason: "screenshot: validation_failed",
      msgId: rawMsgId,
      queueName: rawQueueName,
      route: ROUTE,
    });
    response.status(400).json({ details: errors, error: "Invalid input" });
    return;
  }

  const { id, mediaType, message, queue_name, url, user_id }: ScreenshotPayload = parsed.data;

  const supabase = createServiceClient();

  try {
    let publicURL;

    let isPageScreenshot = false;

    let isFailed = false;

    if (mediaType && mediaType === PDF_MIME_TYPE) {
      console.log("######################## Generating PDF Thumbnail ########################");
      try {
        const { data } = await axios.post(
          env.PDF_URL_SCREENSHOT_API,
          {
            url,
            userId: user_id,
          },
          {
            headers: {
              Authorization: `Bearer ${env.PDF_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          },
        );

        publicURL = data?.publicUrl;
      } catch {
        isFailed = true;
        throw new Error("Failed to generate PDF thumbnail in worker");
      }
    } else {
      console.log("######################## Screenshot Loading ########################");
      try {
        const { data: screenshotData } = await axios.get(
          `${SCREENSHOT_API}/try?url=${encodeURIComponent(url)}`,
          { responseType: "json" },
        );

        const base64data = Buffer.from(screenshotData?.screenshot?.data, "binary").toString(
          "base64",
        );

        isPageScreenshot = screenshotData?.metaData?.isPageScreenshot ?? {};

        // Upload to R2
        publicURL = await upload(base64data, user_id);
      } catch {
        isFailed = true;
        throw new Error("Failed to take screenshot in worker");
      }
    }

    // Update DB with ogImage
    const { data: updatedData, error: updateError } = await supabase
      .from(MAIN_TABLE_NAME)
      .update({ ogImage: publicURL })
      .eq("id", id)
      .eq("user_id", user_id)
      .select();

    if (updateError) {
      console.error("Error updating bookmark:", updateError);
      Sentry.captureException(updateError, {
        extra: { bookmarkId: id, url },
        tags: {
          operation: "screenshot_db_update",
          userId: user_id,
        },
      });
      await storeQueueError({
        errorReason: "screenshot: db_update_failed",
        msgId: message.msg_id,
        queueName: queue_name,
        route: ROUTE,
      });
      response.status(500).json({ error: "Error updating bookmark" });
      return;
    }

    const ogImage = updatedData?.[0]?.ogImage;

    // Get existing metadata
    const { data: existing } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("meta_data, title, description, type")
      .eq("url", url)
      .eq("user_id", user_id)
      .single();

    const newMeta: Record<string, unknown> = {
      ...existing?.meta_data,
      isPageScreenshot,
      mediaType,
    };

    const contentType = resolveContentType({
      mediaType: mediaType ?? undefined,
      type: existing?.type ?? undefined,
    });

    // ai-enrichment
    const aiToggles = await fetchAiToggles({ supabase, userId: user_id });
    const userCollections = await fetchUserCollections({
      autoAssignEnabled: aiToggles.autoAssignCollections,
      supabase,
      userId: user_id,
    });
    const imageToTextResult = await imageToText(
      ogImage,
      supabase,
      user_id,
      { contentType, isOgImage: false },
      {
        collections: userCollections,
        description: existing?.description,
        title: existing?.title,
        url,
      },
      aiToggles,
    );
    if (imageToTextResult) {
      newMeta.image_caption = imageToTextResult.sentence;
      if (Object.keys(imageToTextResult.image_keywords ?? {}).length > 0) {
        newMeta.image_keywords = imageToTextResult.image_keywords;
      }

      newMeta.ocr = imageToTextResult.ocr_text;
      newMeta.ocr_status = imageToTextResult.ocr_text ? "success" : "no_text";
    } else {
      console.warn("imageToText returned empty result (quota may be reached)", url);
      newMeta.ocr = null;
      newMeta.ocr_status = "no_text";
    }

    const { encoded, height, width } = await blurhashFromURL(ogImage);
    if (encoded && width && height) {
      Object.assign(newMeta, {
        height,
        ogImgBlurUrl: encoded,
        width,
      });
    } else {
      console.error("blurhashFromURL returned empty result", url);
    }

    // Update metadata in DB
    await supabase
      .from(MAIN_TABLE_NAME)
      .update({ meta_data: newMeta })
      .eq("url", url)
      .eq("user_id", user_id);

    // Auto-assign collections (non-critical, handled internally)
    await autoAssignCollections({
      bookmarkId: typeof id === "string" ? Number.parseInt(id, 10) : id,
      matchedCollectionIds: imageToTextResult?.matched_collection_ids ?? [],
      route: ROUTE,
      userId: user_id,
    });

    console.log(
      `######################## ${mediaType && mediaType === PDF_MIME_TYPE ? "PDF Thumbnail Generated" : "Screenshot Success"} ########################`,
    );

    // Delete message from queue
    if (!isFailed) {
      const { error: deleteError } = await supabase.schema("pgmq_public").rpc("delete", {
        message_id: message.msg_id,
        queue_name,
      });

      if (deleteError) {
        console.error("Error deleting message from queue");
      }
    }

    response.status(200).json({
      data: updatedData,
      image: publicURL,
      message: "Screenshot captured and uploaded successfully",
    });
  } catch (error) {
    console.error("Error in screenshot handler:", error);
    Sentry.captureException(error, {
      extra: {
        bookmarkId: id,
        msgId: message.msg_id,
        queueName: queue_name,
        url,
      },
      tags: {
        operation: "screenshot_unexpected",
        userId: user_id,
      },
    });
    const errorMessage = error instanceof Error ? error.message : "unknown_error";
    await storeQueueError({
      errorReason: `screenshot: ${errorMessage}`,
      msgId: message.msg_id,
      queueName: queue_name,
      route: ROUTE,
    });
    response.status(500).json({ error: "Internal server error" });
  }
}
