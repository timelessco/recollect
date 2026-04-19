import { after } from "next/server";

import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { addRemainingBookmarkData } from "@/lib/bookmarks/add-remaining-bookmark-data";
import { collectAdditionalImages, collectVideo } from "@/lib/bookmarks/collect-screenshot-media";
import { parseScreenshotResponse } from "@/lib/bookmarks/parse-screenshot-response";
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

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = data.id;
      }
      const telemetryUrl = new URL(data.url);
      telemetryUrl.search = "";
      telemetryUrl.hash = "";
      setPayload(ctx, { url: telemetryUrl.toString() });

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

      setPayload(ctx, { has_screenshot: true });

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
