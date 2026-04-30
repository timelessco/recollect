import { after } from "next/server";

import ky from "ky";

import { env } from "@/env/server";
import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { addRemainingBookmarkData } from "@/lib/bookmarks/add-remaining-bookmark-data";
import { collectAdditionalImages, collectVideo } from "@/lib/bookmarks/collect-screenshot-media";
import { isLikelyValidImageUrl } from "@/lib/bookmarks/image-url-validation";
import { parseScreenshotResponse } from "@/lib/bookmarks/parse-screenshot-response";
import { upload } from "@/lib/storage/media-upload";
import { isNullable } from "@/utils/assertion-utils";
import { MAIN_TABLE_NAME } from "@/utils/constants";
import { vet } from "@/utils/try";
import { toJson } from "@/utils/type-utils";

import { AddUrlScreenshotInputSchema, AddUrlScreenshotOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-add-url-screenshot";
const MAX_LENGTH = 1300;
const SCREENSHOT_TIMEOUT_MS = 60_000;

/** Shape of the bookmark row fetched for screenshot enrichment */
interface BookmarkScreenshotFetchRow {
  description: null | string;
  meta_data: Record<string, unknown> | null;
  ogImage: null | string;
  title: null | string;
}

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = data.id;
      }
      setPayload(ctx, { url: data.url });

      // 1. Capture screenshot from external API
      // `timeout: false` disables ky's 10s default headers-arrival timer — the
      // Vercel-hosted puppeteer service regularly cold-starts for 14–22s
      // (Chromium launch + ad-blocker init + navigation), and without this
      // override ky would abort at 10s before the signal timer has a chance
      // to fire. `signal: AbortSignal.timeout(...)` is the end-to-end
      // wall-clock bound that survives the body read.
      const [screenshotError, screenshotResponse] = await vet(async () => {
        const json = await ky
          .get(`${env.SCREENSHOT_API}?url=${encodeURIComponent(data.url)}`, {
            retry: 0,
            timeout: false,
            signal: AbortSignal.timeout(SCREENSHOT_TIMEOUT_MS),
          })
          .json<unknown>();
        return parseScreenshotResponse(json);
      });

      // Path A — Screenshot FAILED: fire enrichment anyway, then return error
      if (screenshotError) {
        setPayload(ctx, { screenshot_failed: true });

        // Register after() BEFORE throwing — enrichment still runs on screenshot failure
        after(async () => {
          try {
            await addRemainingBookmarkData({
              id: data.id,
              supabase,
              url: data.url,
              userId,
            });
          } catch (error) {
            logger.warn("[add-url-screenshot] after() enrichment failed (screenshot path A)", {
              bookmark_id: data.id,
              user_id: userId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });

        throw new RecollectApiError("service_unavailable", {
          cause: screenshotError,
          message: "Error capturing screenshot",
          operation: "screenshot_capture",
        });
      }

      // Path B — Screenshot SUCCEEDED
      // 2. Upload screenshot to R2
      const base64data = screenshotResponse.screenshotBuffer.toString("base64");

      const { description, isPageScreenshot, title } = screenshotResponse.metaData ?? {};

      const publicURL = await upload(base64data, userId);

      // 3. Fetch existing bookmark data
      const { data: existingBookmark, error: fetchError } = await supabase
        .from(MAIN_TABLE_NAME)
        .select("meta_data, ogImage, title, description")
        .match({ id: data.id, user_id: userId })
        .single<BookmarkScreenshotFetchRow>();

      if (fetchError) {
        throw new RecollectApiError("service_unavailable", {
          cause: fetchError,
          message: "Error fetching bookmark data",
          operation: "fetch_existing_bookmark",
        });
      }

      if (isNullable(existingBookmark)) {
        throw new RecollectApiError("not_found", {
          message: "Bookmark not found",
          operation: "fetch_existing_bookmark",
        });
      }

      const existingMetaData = existingBookmark.meta_data ?? {};

      // Screenshot service can return empty strings for title/description on
      // blocked or empty pages. `??` only catches nullish, so `""` would
      // overwrite a real scraper value from t1. Treat empty/whitespace-only as
      // "no update" so the t1 value wins.
      const normalizeMeta = (value: string | null | undefined, fallback: null | string) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed.slice(0, MAX_LENGTH) : fallback;
      };

      const updatedTitle = normalizeMeta(title, existingBookmark.title);
      const updatedDescription = normalizeMeta(description, existingBookmark.description);

      // 4. Early write — land the screenshot URL in the DB as soon as the R2
      // upload is done. The subsequent additionalImages + video collection can
      // take several seconds; without this split, Realtime subscribers (the
      // bookmark-enrichment channel) wouldn't see the screenshot until that
      // whole batch finishes. Writing screenshot first lets the UI render it
      // live while the rest of the meta_data is still being assembled.
      // Preserve a previously-persisted coverImage (e.g., from an earlier
      // enrichment run picked up by the queue worker) — only fall back to the
      // existing ogImage when no coverImage has been set yet. Without this
      // guard, re-runs on already-enriched rows would clobber a real R2
      // coverImage URL with the (possibly null) ogImage column value.
      // If the scraper-returned ogImage is missing or broken (e.g. Next.js
      // pages with unset metadataBase emit "https://undefined/..."), backfill
      // ogImage with the captured screenshot so the client never has to
      // render a dead URL while `after()` enrichment is still running.
      const existingCoverImage =
        typeof existingMetaData.coverImage === "string" && existingMetaData.coverImage
          ? existingMetaData.coverImage
          : null;

      const shouldBackfillOgImage = !isLikelyValidImageUrl(existingBookmark.ogImage);

      const earlyMetaData = {
        ...existingMetaData,
        coverImage:
          existingCoverImage ?? (shouldBackfillOgImage ? publicURL : existingBookmark.ogImage),
        isPageScreenshot,
        screenshot: publicURL,
      };

      if (shouldBackfillOgImage) {
        setPayload(ctx, { ogimage_backfilled_with_screenshot: true });
      }

      const { error: earlyUpdateError } = await supabase
        .from(MAIN_TABLE_NAME)
        .update({
          description: updatedDescription,
          meta_data: toJson(earlyMetaData),
          title: updatedTitle,
          ...(shouldBackfillOgImage ? { ogImage: publicURL } : {}),
        })
        .match({ id: data.id, user_id: userId });

      if (earlyUpdateError) {
        throw new RecollectApiError("service_unavailable", {
          cause: earlyUpdateError,
          message: "Error persisting screenshot",
          operation: "update_bookmark_screenshot_early",
        });
      }

      setPayload(ctx, { has_screenshot: true });

      // 5. Collect additional images + video in parallel
      const [additionalImagesSettled, additionalVideoSettled] = await Promise.allSettled([
        collectAdditionalImages({
          allImages: screenshotResponse.allImages,
          userId,
        }),
        collectVideo({
          userId,
          videoUrl: screenshotResponse.allVideos?.at(0) ?? null,
        }),
      ]);

      const additionalImages =
        additionalImagesSettled.status === "fulfilled" ? additionalImagesSettled.value : [];

      if (additionalImagesSettled.status === "rejected") {
        setPayload(ctx, { additional_images_failed: true });
      }

      const additionalVideoResult =
        additionalVideoSettled.status === "fulfilled"
          ? additionalVideoSettled.value
          : {
              error: "unknown" as const,
              message: "collectVideo promise rejected",
              success: false as const,
            };

      if (additionalVideoSettled.status === "rejected") {
        setPayload(ctx, { additional_video_failed: true });
      }

      if (!additionalVideoResult.success) {
        setPayload(ctx, { video_collection_error: additionalVideoResult.error });
      }

      // 6. Final write — merge additionalImages + additionalVideos on top of
      // the meta_data persisted in the early write.
      const finalMetaData = {
        ...earlyMetaData,
        additionalImages,
        additionalVideos:
          additionalVideoResult.success && additionalVideoResult.url
            ? [additionalVideoResult.url]
            : [],
      };

      const { data: updateData, error: updateError } = await supabase
        .from(MAIN_TABLE_NAME)
        .update({
          meta_data: toJson(finalMetaData),
        })
        .match({ id: data.id, user_id: userId })
        .select("id, ogImage, title, description, meta_data");

      if (updateError) {
        throw new RecollectApiError("service_unavailable", {
          cause: updateError,
          message: "Error updating bookmark with screenshot",
          operation: "update_bookmark_screenshot",
        });
      }

      if (isNullable(updateData) || updateData.length === 0) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("No data returned from the database"),
          message: "No data returned from the database",
          operation: "update_bookmark_screenshot",
        });
      }

      // 7. Fire remaining enrichment in background
      after(async () => {
        try {
          await addRemainingBookmarkData({
            favIcon: data.favIcon ?? undefined,
            id: data.id,
            supabase,
            url: data.url,
            userId,
          });
        } catch (error) {
          logger.warn("[add-url-screenshot] after() enrichment failed (screenshot path B)", {
            bookmark_id: data.id,
            user_id: userId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      return updateData;
    },
    inputSchema: AddUrlScreenshotInputSchema,
    outputSchema: AddUrlScreenshotOutputSchema,
    route: ROUTE,
  }),
);
