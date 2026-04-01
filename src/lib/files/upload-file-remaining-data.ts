import * as Sentry from "@sentry/nextjs";

import type { StructuredKeywords } from "@/async/ai/schemas/image-analysis-schema";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { imageToText } from "@/async/ai/image-analysis";
import { fetchAiToggles } from "@/utils/ai-feature-toggles";
import { isNullable } from "@/utils/assertion-utils";
import { autoAssignCollections, fetchUserCollections } from "@/utils/auto-assign-collections";
import { AUDIO_OG_IMAGE_FALLBACK_URL, MAIN_TABLE_NAME } from "@/utils/constants";
import { blurhashFromURL } from "@/utils/getBlurHash";
import { resolveContentType } from "@/utils/resolve-content-type";
import { toJson } from "@/utils/type-utils";

/** Shape of meta_data JSON fields relevant to file enrichment */
interface FileMetaData {
  [key: string]: unknown;
  coverImage?: null | string;
  favIcon?: null | string;
  height?: null | number;
  iframeAllowed?: boolean;
  image_caption?: null | string;
  image_keywords?: StructuredKeywords;
  img_caption?: null | string;
  isOgImagePreferred?: boolean;
  isPageScreenshot?: null | string;
  mediaType?: null | string;
  ocr?: null | string;
  ocr_status?: "limit_reached" | "no_text" | "success";
  ogImgBlurUrl?: null | string;
  screenshot?: null | string;
  twitter_avatar_url?: null | string;
  video_url?: null | string;
  width?: null | number;
}

/** Shape of the bookmark row fetched for metadata merge */
interface BookmarkMetaRow {
  meta_data: FileMetaData | null;
}

export interface UploadFileRemainingDataProps {
  id: number;
  mediaType: null | string;
  publicUrl: string;
  supabase: SupabaseClient<Database>;
  userId: string;
}

/**
 * Processes file enrichment: blurhash, AI image-to-text (OCR/caption/keywords),
 * metadata merge, and auto-assign collections.
 *
 * Simpler than addRemainingBookmarkData — no image downloads or R2 uploads.
 * The file is already uploaded client-side; this processes its remaining metadata.
 *
 * Throws on critical errors. Non-critical operations (blurhash, AI) log warnings
 * but do not throw.
 *
 * Called from:
 * - v2 thin wrapper endpoint (factory try-catch converts to apiError)
 * - after() in upload-file route (caller's try-catch captures with Sentry)
 */
export async function uploadFileRemainingData(props: UploadFileRemainingDataProps): Promise<void> {
  const { id, mediaType, publicUrl, supabase, userId } = props;

  console.log("[upload-file-remaining-data] Starting enrichment:", {
    bookmarkId: id,
    mediaType,
    publicUrl,
  });

  // 1. Fetch AI toggles and user collections
  const aiToggles = await fetchAiToggles({ supabase, userId });
  const userCollections = await fetchUserCollections({
    autoAssignEnabled: aiToggles.autoAssignCollections,
    supabase,
    userId,
  });

  console.log("[upload-file-remaining-data] AI toggles and collections:", {
    aiToggles,
    bookmarkId: id,
    collectionCount: userCollections.length,
  });

  // 2. Process file metadata (blurhash + AI analysis)
  const ogImage = mediaType?.includes("audio") ? AUDIO_OG_IMAGE_FALLBACK_URL : publicUrl;
  let imageCaption: null | string = null;
  let imageKeywords: StructuredKeywords = {};
  let imageOcrValue: null | string = null;
  let ocrStatus: "limit_reached" | "no_text" | "success" = "no_text";
  let matchedCollectionIds: number[] = [];

  // 2a. AI image-to-text (OCR, caption, keywords)
  if (ogImage) {
    try {
      const contentType = resolveContentType({
        mediaType,
        type: undefined,
      });

      const imageToTextResult = await imageToText(
        ogImage,
        supabase,
        userId,
        { contentType },
        { collections: userCollections },
        aiToggles,
      );

      if (imageToTextResult) {
        imageCaption = imageToTextResult.sentence;
        imageKeywords = imageToTextResult.image_keywords ?? {};
        matchedCollectionIds = imageToTextResult.matched_collection_ids;
        imageOcrValue = imageToTextResult.ocr_text;
        ocrStatus = imageToTextResult.ocr_text ? "success" : "no_text";

        console.log("[upload-file-remaining-data] AI analysis complete:", {
          bookmarkId: id,
          hasCaption: Boolean(imageCaption),
          keywordCount: Object.keys(imageKeywords).length,
          matchedCollections: matchedCollectionIds.length,
          ocrStatus,
        });
      }
    } catch (error) {
      console.warn("[upload-file-remaining-data] AI processing error:", { bookmarkId: id, error });
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        extra: { bookmarkId: id },
        tags: { operation: "gemini_ai_processing", userId },
      });
    }
  }

  // 2b. Blurhash generation
  let imgData: {
    encoded?: null | string;
    height?: null | number;
    width?: null | number;
  } = {};

  if (publicUrl) {
    try {
      imgData = await blurhashFromURL(publicUrl);
      console.log("[upload-file-remaining-data] Blurhash generated:", {
        bookmarkId: id,
        hasEncoded: Boolean(imgData.encoded),
      });
    } catch (error) {
      console.warn("[upload-file-remaining-data] Blurhash error:", { bookmarkId: id, error });
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        extra: { bookmarkId: id },
        tags: { operation: "generate_blurhash", userId },
      });
    }
  }

  // 3. Build new meta_data
  const newMetaData: FileMetaData = {
    coverImage: null,
    favIcon: null,
    height: imgData.height ?? null,
    iframeAllowed: false,
    image_caption: imageCaption,
    image_keywords: Object.keys(imageKeywords).length > 0 ? imageKeywords : undefined,
    img_caption: imageCaption,
    isOgImagePreferred: false,
    isPageScreenshot: null,
    mediaType,
    ocr: imageOcrValue ?? null,
    ocr_status: ocrStatus,
    ogImgBlurUrl: imgData.encoded ?? null,
    screenshot: null,
    twitter_avatar_url: null,
    video_url: null,
    width: imgData.width ?? null,
  };

  // 4. Fetch existing metadata and merge (preserve existing values when new ones are null)
  const { data: existing, error: fetchError } = await supabase
    .from(MAIN_TABLE_NAME)
    .select("meta_data")
    .match({ id, user_id: userId })
    .single<BookmarkMetaRow>();

  if (fetchError) {
    throw new Error(`Failed to fetch existing metadata: ${fetchError.message}`);
  }

  if (isNullable(existing)) {
    throw new Error(`Bookmark not found with id: ${id}`);
  }

  const existingMeta = existing.meta_data ?? {};

  const mergedMeta = {
    ...existingMeta,
    ...Object.fromEntries(
      Object.entries(newMetaData).map(([key, value]) => [
        key,
        value ?? existingMeta[key as keyof FileMetaData],
      ]),
    ),
  };

  // 5. Update bookmark in database
  const { error: dbError } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({
      description: newMetaData.img_caption ?? "",
      meta_data: toJson(mergedMeta),
      ogImage: mediaType?.includes("audio") ? ogImage : publicUrl,
    })
    .match({ id, user_id: userId });

  if (dbError) {
    throw new Error(`Failed to update file metadata: ${dbError.message}`);
  }

  console.log("[upload-file-remaining-data] DB update successful:", { bookmarkId: id });

  // 6. Auto-assign collections (non-critical, handled internally)
  await autoAssignCollections({
    bookmarkId: id,
    matchedCollectionIds,
    route: "upload-file-remaining-data",
    userId,
  });

  console.log("[upload-file-remaining-data] Enrichment complete:", { bookmarkId: id });
}
