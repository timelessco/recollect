import { NextResponse } from "next/server";

import ky from "ky";

import { imageToText } from "@/async/ai/image-analysis";
import { runEmbeddingPipeline } from "@/async/ai/run-embedding-pipeline";
import { env } from "@/env/server";
import { createAxiomRouteHandler, withRawBody } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { storeQueueError } from "@/lib/api-helpers/queue";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { isLikelyValidImageUrl } from "@/lib/bookmarks/image-url-validation";
import { parseScreenshotResponse } from "@/lib/bookmarks/parse-screenshot-response";
import { upload } from "@/lib/storage/media-upload";
import { createServerServiceClient } from "@/lib/supabase/service";
import { fetchAiToggles } from "@/utils/ai-feature-toggles";
import { isNonNullable } from "@/utils/assertion-utils";
import { autoAssignCollections, fetchUserCollections } from "@/utils/auto-assign-collections";
import { MAIN_TABLE_NAME, PDF_MIME_TYPE } from "@/utils/constants";
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
      } catch (error) {
        await storeQueueError({
          errorReason: "screenshot: malformed_json",
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
        ctx.fields.msg_id = message.msg_id;
        ctx.fields.bookmark_id = id;
      }
      setPayload(ctx, {
        queue_name,
        url,
        media_type: mediaType,
      });

      try {
        // Fetch current bookmark state — used for idempotency + AI context in one round trip.
        // If `ogImage` is already set (pgmq retry after a prior partial success, or an admin
        // replay from the pgmq."a_ai-embeddings" archive via retry_ai_embeddings_archive /
        // admin_retry_ai_embeddings_archives), we skip screenshot capture + R2 upload + DB
        // write and only re-run AI enrichment. This keeps retries cheap and leaves the
        // existing archive-on-failure path intact so AI failures still hit the dead-letter
        // queue and can be replayed when Gemini recovers.
        const { data: existing } = await supabase
          .from(MAIN_TABLE_NAME)
          .select("ogImage, meta_data, title, description, type")
          .eq("id", id)
          .eq("user_id", user_id)
          .single();

        const existingMeta = isRecord(existing?.meta_data) ? existing.meta_data : {};
        // Idempotency guard: only treat the existing ogImage as "already
        // processed" if it's a URL we could actually fetch. Malformed
        // values like "https://undefined/..." (e.g. from a Next.js page
        // with unset metadataBase) must not short-circuit capture, or
        // AI/blurhash run on a dead URL.
        const existingOgImage = isLikelyValidImageUrl(existing?.ogImage) ? existing.ogImage : null;

        let publicURL: null | string = existingOgImage;
        let isPageScreenshot: unknown = existingMeta.isPageScreenshot ?? false;

        const screenshotSkipped = existingOgImage !== null;

        if (!screenshotSkipped) {
          if (mediaType === PDF_MIME_TYPE) {
            // PDF screenshot via external API
            try {
              const pdfResult = await ky
                .post(env.PDF_URL_SCREENSHOT_API, {
                  json: { url, userId: user_id },
                  headers: { Authorization: `Bearer ${env.PDF_SECRET_KEY}` },
                  timeout: false,
                })
                .json<unknown>();
              publicURL =
                isRecord(pdfResult) && typeof pdfResult.publicUrl === "string"
                  ? pdfResult.publicUrl
                  : null;
            } catch (error) {
              throw new Error("Failed to generate PDF thumbnail in worker", { cause: error });
            }
          } else {
            // Regular screenshot via screenshot service. The upstream returns the JPEG as
            // `{ type: "Buffer", data: number[] }`; `parseScreenshotResponse` handles that
            // shape plus a legacy base64-string path. A 0-byte buffer must throw — the
            // queue-worker path silently uploaded empty R2 blobs for months before this
            // guard was added, which bubbled up as Gemini `INVALID_ARGUMENT`.
            try {
              const screenshotData = await ky
                .get(`${env.SCREENSHOT_API}/try?url=${encodeURIComponent(url)}`, {
                  retry: 0,
                  timeout: false,
                })
                .json<unknown>();
              const { metaData: responseMeta, screenshotBuffer } =
                parseScreenshotResponse(screenshotData);

              if (screenshotBuffer.byteLength === 0) {
                throw new Error("Screenshot service returned empty payload");
              }

              isPageScreenshot = responseMeta.isPageScreenshot ?? false;
              publicURL = await upload(screenshotBuffer.toString("base64"), user_id);
            } catch (error) {
              throw new Error("Failed to take screenshot in worker", { cause: error });
            }
          }

          // Persist `isPageScreenshot` alongside `ogImage` so a retry after a
          // partial-success (AI or blurhash failure before the final meta write)
          // can still read the flag from `existingMeta` instead of defaulting to
          // `false` and losing the lightbox screenshot-scaling signal.
          const { error: updateError } = await supabase
            .from(MAIN_TABLE_NAME)
            .update({
              ogImage: publicURL,
              meta_data: toJson({
                ...existingMeta,
                isPageScreenshot,
                mediaType,
              }),
            })
            .eq("id", id)
            .eq("user_id", user_id);

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
        }

        if (screenshotSkipped) {
          setPayload(ctx, { screenshot_skipped: true });
        }

        const ogImage = publicURL ?? "";

        const newMeta: Record<string, unknown> = {
          ...existingMeta,
          isPageScreenshot,
          mediaType,
        };

        const contentType = resolveContentType({
          mediaType: mediaType ?? undefined,
          type: existing?.type ?? undefined,
        });

        // AI enrichment (toggle-gated). Throws propagate to the outer catch and become a 503
        // so pgmq retries and eventually archives the message — recoverable via
        // retry_ai_embeddings_archive / admin_retry_ai_embeddings_archives once Gemini is up.
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
          setPayload(ctx, { image_to_text_empty: true });
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
        } else {
          setPayload(ctx, { blurhash_empty: true });
        }

        // Update metadata in DB. A Supabase `{error}` here is otherwise silent — the outer
        // try/catch only sees thrown exceptions, so without this check a failed meta_data
        // write would return 200, pgmq would delete the message, and AI enrichment would be
        // permanently lost for this bookmark (no archive handle). Throw to route into the
        // same 503 → pgmq archive → replay path as every other failure in this handler.
        const { error: metaUpdateError } = await supabase
          .from(MAIN_TABLE_NAME)
          .update({ meta_data: toJson(newMeta) })
          .eq("id", id)
          .eq("user_id", user_id);

        if (metaUpdateError) {
          await storeQueueError({
            errorReason: "screenshot: meta_update_failed",
            msgId: message.msg_id,
            queueName: queue_name,
            route,
          });
          throw new RecollectApiError("service_unavailable", {
            cause: metaUpdateError,
            message: "Error updating bookmark metadata",
            operation: "screenshot_meta_update",
          });
        }

        // Auto-assign collections (non-critical, handled internally)
        await autoAssignCollections({
          bookmarkId: id,
          matchedCollectionIds: imageToTextResult?.matched_collection_ids ?? [],
          route,
          userId: user_id,
        });

        if (ogImage) {
          await runEmbeddingPipeline({
            bookmarkId: id,
            ctx,
            ogImage,
            supabase,
            userId: user_id,
          });
        }

        // Delete message from queue on success
        const { error: deleteError } = await supabase.schema("pgmq_public").rpc("delete", {
          message_id: message.msg_id,
          queue_name,
        });

        if (deleteError) {
          setPayload(ctx, { queue_delete_error: deleteError.message });
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
