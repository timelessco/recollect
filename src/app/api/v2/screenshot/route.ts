import { NextResponse } from "next/server";

import { imageToText } from "@/async/ai/imageToText";
import { env } from "@/env/server";
import { createAxiomRouteHandler, withRawBody } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { storeQueueError } from "@/lib/api-helpers/queue";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { upload } from "@/lib/storage/media-upload";
import { createServerServiceClient } from "@/lib/supabase/service";
import { fetchAiToggles } from "@/utils/ai-feature-toggles";
import { isNonNullable } from "@/utils/assertion-utils";
import { autoAssignCollections, fetchUserCollections } from "@/utils/auto-assign-collections";
import { MAIN_TABLE_NAME, PDF_MIME_TYPE, SCREENSHOT_API } from "@/utils/constants";
import { blurhashFromURL } from "@/utils/getBlurHash";
import { resolveContentType } from "@/utils/resolve-content-type";
import { toJson } from "@/utils/type-utils";

import { ScreenshotInputSchema, ScreenshotOutputSchema } from "./schema";

const ROUTE = "v2-screenshot";

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
      } catch {
        await storeQueueError({
          errorReason: "screenshot: malformed_json",
          msgId: undefined,
          queueName: undefined,
          route,
        });
        throw new RecollectApiError("bad_request", {
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
      const parsed = ScreenshotInputSchema.safeParse(body);
      if (!parsed.success) {
        await storeQueueError({
          errorReason: "screenshot: validation_failed",
          msgId: rawMsgId,
          queueName: rawQueueName,
          route,
        });
        throw new RecollectApiError("bad_request", {
          message: "Invalid input",
          context: { errors: parsed.error.issues },
        });
      }

      const { id: rawId, mediaType, message, queue_name, url, user_id } = parsed.data;
      const id = typeof rawId === "string" ? Number.parseInt(rawId, 10) : rawId;
      const supabase = createServerServiceClient();

      if (ctx?.fields) {
        ctx.fields.user_id = user_id;
        ctx.fields.queue_name = queue_name;
        ctx.fields.msg_id = message.msg_id;
        ctx.fields.bookmark_id = id;
        ctx.fields.url = url;
        ctx.fields.media_type = mediaType;
      }

      try {
        let publicURL: null | string = null;
        let isPageScreenshot: unknown = false;

        if (mediaType === PDF_MIME_TYPE) {
          // PDF screenshot via external API
          try {
            const response = await fetch(env.PDF_URL_SCREENSHOT_API, {
              body: JSON.stringify({ url, userId: user_id }),
              headers: {
                Authorization: `Bearer ${env.PDF_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
              method: "POST",
            });
            if (!response.ok) {
              throw new Error(`PDF screenshot API returned ${String(response.status)}`);
            }

            const pdfResult: unknown = await response.json();
            publicURL =
              isRecord(pdfResult) && typeof pdfResult.publicUrl === "string"
                ? pdfResult.publicUrl
                : null;
          } catch {
            throw new Error("Failed to generate PDF thumbnail in worker");
          }
        } else {
          // Regular screenshot via screenshot service
          try {
            const response = await fetch(`${SCREENSHOT_API}/try?url=${encodeURIComponent(url)}`);
            if (!response.ok) {
              throw new Error(`Screenshot API returned ${String(response.status)}`);
            }

            const screenshotData: unknown = await response.json();
            const screenshotRecord = isRecord(screenshotData) ? screenshotData : {};
            const screenshotInner = isRecord(screenshotRecord.screenshot)
              ? screenshotRecord.screenshot
              : {};
            const screenshotBinaryData =
              typeof screenshotInner.data === "string" ? screenshotInner.data : "";

            const base64data = Buffer.from(screenshotBinaryData, "binary").toString("base64");

            const metaDataRecord = isRecord(screenshotRecord.metaData)
              ? screenshotRecord.metaData
              : {};
            // Preserve v1 behavior: isPageScreenshot can be boolean or {} (fallback)
            isPageScreenshot = metaDataRecord.isPageScreenshot ?? {};

            publicURL = await upload(base64data, user_id);
          } catch {
            throw new Error("Failed to take screenshot in worker");
          }
        }

        // Update bookmark with ogImage
        const { data: updatedData, error: updateError } = await supabase
          .from(MAIN_TABLE_NAME)
          .update({ ogImage: publicURL })
          .eq("id", id)
          .eq("user_id", user_id)
          .select();

        if (updateError) {
          await storeQueueError({
            errorReason: "screenshot: db_update_failed",
            msgId: message.msg_id,
            queueName: queue_name,
            route,
          });
          throw new RecollectApiError("service_unavailable", {
            cause: updateError,
            message: "Error updating bookmark",
            operation: "screenshot_db_update",
          });
        }

        const ogImage = updatedData?.at(0)?.ogImage ?? publicURL ?? "";

        // Get existing metadata for AI enrichment context
        const { data: existing } = await supabase
          .from(MAIN_TABLE_NAME)
          .select("meta_data, title, description, type")
          .eq("url", url)
          .eq("user_id", user_id)
          .single();

        const existingMeta = isRecord(existing?.meta_data) ? existing.meta_data : {};
        const newMeta: Record<string, unknown> = {
          ...existingMeta,
          isPageScreenshot,
          mediaType,
        };

        const contentType = resolveContentType({
          mediaType: mediaType ?? undefined,
          type: existing?.type ?? undefined,
        });

        // AI enrichment (toggle-gated)
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

        if (isNonNullable(imageToTextResult)) {
          newMeta.image_caption = imageToTextResult.sentence;
          if (Object.keys(imageToTextResult.image_keywords ?? {}).length > 0) {
            newMeta.image_keywords = imageToTextResult.image_keywords;
          }
          newMeta.ocr = imageToTextResult.ocr_text;
          newMeta.ocr_status = imageToTextResult.ocr_text ? "success" : "no_text";
        } else {
          if (ctx?.fields) {
            ctx.fields.image_to_text_empty = true;
          }
          newMeta.ocr = null;
          newMeta.ocr_status = "no_text";
        }

        // Blurhash generation
        const { encoded, height, width } = await blurhashFromURL(ogImage);
        if (encoded && width && height) {
          Object.assign(newMeta, {
            height,
            ogImgBlurUrl: encoded,
            width,
          });
        } else if (ctx?.fields) {
          ctx.fields.blurhash_empty = true;
        }

        // Update metadata in DB
        await supabase
          .from(MAIN_TABLE_NAME)
          .update({ meta_data: toJson(newMeta) })
          .eq("url", url)
          .eq("user_id", user_id);

        // Auto-assign collections (non-critical, handled internally)
        await autoAssignCollections({
          bookmarkId: id,
          matchedCollectionIds: imageToTextResult?.matched_collection_ids ?? [],
          route,
          userId: user_id,
        });

        // Delete message from queue on success
        const { error: deleteError } = await supabase.schema("pgmq_public").rpc("delete", {
          message_id: message.msg_id,
          queue_name,
        });

        if (deleteError && ctx?.fields) {
          ctx.fields.queue_delete_error = deleteError.message;
        }

        return NextResponse.json({ message: "Screenshot captured and uploaded successfully" });
      } catch (error) {
        if (error instanceof RecollectApiError) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : "unknown_error";
        await storeQueueError({
          errorReason: `screenshot: ${errorMessage}`,
          msgId: message.msg_id,
          queueName: queue_name,
          route,
        });
        throw new RecollectApiError("service_unavailable", {
          cause: error instanceof Error ? error : new Error(String(error)),
          message: "Internal server error",
          operation: "screenshot_unexpected",
        });
      }
    },
    inputSchema: ScreenshotInputSchema,
    outputSchema: ScreenshotOutputSchema,
    route: ROUTE,
  }),
);
