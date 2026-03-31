import { after } from "next/server";

import * as Sentry from "@sentry/nextjs";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { addRemainingBookmarkData } from "@/lib/bookmarks/add-remaining-bookmark-data";
import { collectAdditionalImages, collectVideo } from "@/lib/bookmarks/collect-screenshot-media";
import { upload } from "@/lib/storage/media-upload";
import { isNullable } from "@/utils/assertion-utils";
import { MAIN_TABLE_NAME, SCREENSHOT_API } from "@/utils/constants";
import { vet } from "@/utils/try";
import { toJson } from "@/utils/type-utils";

import { AddUrlScreenshotInputSchema, AddUrlScreenshotOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-add-url-screenshot";
const MAX_LENGTH = 1300;
const SCREENSHOT_TIMEOUT_MS = 30_000;

/** Shape of the bookmark row fetched for screenshot enrichment */
interface BookmarkScreenshotFetchRow {
  description: null | string;
  meta_data: Record<string, unknown> | null;
  ogImage: null | string;
  title: null | string;
}

/* oxlint-disable @typescript-eslint/no-unsafe-type-assertion -- external API type boundary with runtime guards */

/** Parses the screenshot API JSON response safely from an unknown value */
function parseScreenshotResponse(json: unknown) {
  const obj = json !== null && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const metaData =
    obj.metaData !== null && typeof obj.metaData === "object"
      ? (obj.metaData as Record<string, unknown>)
      : {};
  const screenshot =
    obj.screenshot !== null && typeof obj.screenshot === "object"
      ? (obj.screenshot as Record<string, unknown>)
      : {};

  return {
    allImages: Array.isArray(obj.allImages) ? (obj.allImages as string[]) : undefined,
    allVideos: Array.isArray(obj.allVideos) ? (obj.allVideos as string[]) : undefined,
    metaData: {
      description: typeof metaData.description === "string" ? metaData.description : undefined,
      isPageScreenshot:
        typeof metaData.isPageScreenshot === "boolean" ? metaData.isPageScreenshot : undefined,
      title: typeof metaData.title === "string" ? metaData.title : undefined,
    },
    screenshotData: typeof screenshot.data === "string" ? screenshot.data : "",
  };
}

/* oxlint-enable @typescript-eslint/no-unsafe-type-assertion */

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = data.id;
        ctx.fields.url = data.url;
      }

      // 1. Capture screenshot from external API
      const [screenshotError, screenshotResponse] = await vet(async () => {
        const r = await fetch(`${SCREENSHOT_API}/try?url=${encodeURIComponent(data.url)}`, {
          signal: AbortSignal.timeout(SCREENSHOT_TIMEOUT_MS),
        });
        if (!r.ok) {
          throw new Error(`Screenshot API returned ${String(r.status)}`);
        }
        const json: unknown = await r.json();
        return parseScreenshotResponse(json);
      });

      // Path A — Screenshot FAILED: fire enrichment anyway, then return error
      if (screenshotError) {
        if (ctx?.fields) {
          ctx.fields.screenshot_failed = true;
        }

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
            // Sentry retained: after() callbacks run outside the factory's runWithServerContext
            // try/catch — onRequestError cannot intercept errors thrown here.
            Sentry.captureException(error, {
              extra: { bookmarkId: data.id },
              tags: { operation: "after_remaining_bookmark_data_screenshot_failed", userId },
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
      const base64data = Buffer.from(screenshotResponse.screenshotData, "binary").toString(
        "base64",
      );

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

      const updatedTitle = title?.slice(0, MAX_LENGTH) ?? existingBookmark.title;
      const updatedDescription = description?.slice(0, MAX_LENGTH) ?? existingBookmark.description;

      // 4. Collect additional images + video in parallel
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

      if (additionalImagesSettled.status === "rejected" && ctx?.fields) {
        ctx.fields.additional_images_failed = true;
      }

      const additionalVideoResult =
        additionalVideoSettled.status === "fulfilled"
          ? additionalVideoSettled.value
          : {
              error: "unknown" as const,
              message: "collectVideo promise rejected",
              success: false as const,
            };

      if (additionalVideoSettled.status === "rejected" && ctx?.fields) {
        ctx.fields.additional_video_failed = true;
      }

      if (!additionalVideoResult.success && ctx?.fields) {
        ctx.fields.video_collection_error = additionalVideoResult.error;
      }

      // 5. Build updated meta_data with screenshot
      const updatedMetaData = {
        ...existingMetaData,
        additionalImages,
        additionalVideos:
          additionalVideoResult.success && additionalVideoResult.url
            ? [additionalVideoResult.url]
            : [],
        coverImage: existingBookmark.ogImage,
        isPageScreenshot,
        screenshot: publicURL,
      };

      // 6. Update bookmark in DB
      const { data: updateData, error: updateError } = await supabase
        .from(MAIN_TABLE_NAME)
        .update({
          description: updatedDescription,
          meta_data: toJson(updatedMetaData),
          title: updatedTitle,
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

      if (ctx?.fields) {
        ctx.fields.has_screenshot = true;
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
          // Sentry retained: after() callbacks run outside the factory's runWithServerContext
          // try/catch — onRequestError cannot intercept errors thrown here.
          Sentry.captureException(error, {
            extra: { bookmarkId: data.id },
            tags: { operation: "after_remaining_bookmark_data", userId },
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
