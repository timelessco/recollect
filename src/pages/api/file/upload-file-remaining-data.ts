/** @deprecated Use v2 route at /api/v2/file/upload-file-remaining-data instead. Kept for mobile/extension consumers. */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";

import type {
  StructuredKeywords,
  UserCollection,
} from "../../../async/ai/schemas/image-analysis-schema";
import type {
  ImgMetadataType,
  NextApiRequest,
  SingleListData,
  UploadFileApiResponse,
} from "../../../types/apiTypes";
import type { AiToggles } from "@/utils/ai-feature-toggles";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAiToggles } from "@/utils/ai-feature-toggles";
import { autoAssignCollections, fetchUserCollections } from "@/utils/auto-assign-collections";
import { resolveContentType } from "@/utils/resolve-content-type";

import { imageToText } from "../../../async/ai/image-analysis";
import { AUDIO_OG_IMAGE_FALLBACK_URL, MAIN_TABLE_NAME } from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = UploadFileApiResponse;

const notVideoLogic = async (
  publicUrl: string,
  mediaType: null | string,
  supabase: SupabaseClient,
  userId: string,
  userCollections: UserCollection[],
  aiToggles: AiToggles,
) => {
  const ogImage = mediaType?.includes("audio") ? AUDIO_OG_IMAGE_FALLBACK_URL : publicUrl;
  let imageCaption: null | string = null;
  let imageKeywords: StructuredKeywords = {};
  let imageOcrValue = null;
  let ocrStatus: "limit_reached" | "no_text" | "success" = "no_text";
  let matchedCollectionIds: number[] = [];

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
      }
    } catch (error) {
      console.warn("Gemini AI processing error", error);
    }
  }

  let imgData;

  if (publicUrl) {
    try {
      imgData = await blurhashFromURL(publicUrl);
    } catch (error) {
      console.warn("blurhashFromURL error", error);
      imgData = {};
    }
  }

  const meta_data = {
    coverImage: null,
    favIcon: null,
    height: imgData?.height ?? null,
    iframeAllowed: false,
    image_caption: imageCaption,
    image_keywords: Object.keys(imageKeywords).length > 0 ? imageKeywords : undefined,
    img_caption: imageCaption,
    isOgImagePreferred: false,
    isPageScreenshot: null,
    mediaType,
    ocr: imageOcrValue ?? null,
    ocr_status: ocrStatus,
    ogImgBlurUrl: imgData?.encoded ?? null,
    twitter_avatar_url: null,
    video_url: null,
    width: imgData?.width ?? null,
  };

  return { matchedCollectionIds, meta_data, ogImage };
};

export default async function handler(
  request: NextApiRequest<{
    id: SingleListData["id"];
    mediaType: ImgMetadataType["mediaType"];
    publicUrl: SingleListData["ogImage"];
  }>,
  response: NextApiResponse<Data>,
) {
  if (request.method !== "POST") {
    response.status(405).json({ data: null, error: "Method Not Allowed", success: false });
    return;
  }

  try {
    const { id, mediaType, publicUrl } = request.body;

    const supabase = apiSupabaseClient(request, response);

    // Check for auth errors
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (userError || !userId) {
      console.warn("User authentication failed:", {
        error: userError?.message,
      });
      response.status(401).json({ data: null, error: "Unauthorized", success: false });
      return;
    }

    // Entry point log
    console.log("upload-file-remaining-data API called:", {
      id,
      mediaType,
      publicUrl,
      userId,
    });

    let meta_data: ImgMetadataType = {
      coverImage: null,
      favIcon: null,
      height: null,
      iframeAllowed: false,
      image_caption: null,
      img_caption: null,
      isOgImagePreferred: false,
      isPageScreenshot: null,
      mediaType: "",
      ocr: null,
      ogImgBlurUrl: null,
      twitter_avatar_url: null,
      video_url: null,
      width: null,
    };

    const aiToggles = await fetchAiToggles({ supabase, userId });
    const userCollections = await fetchUserCollections({
      autoAssignEnabled: aiToggles.autoAssignCollections,
      supabase,
      userId,
    });

    const {
      matchedCollectionIds,
      meta_data: metaData,
      ogImage,
    } = await notVideoLogic(publicUrl, mediaType, supabase, userId, userCollections, aiToggles);

    // Fetch existing metadata
    const { data: existing, error: fetchError } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("meta_data")
      .match({ id, user_id: userId })
      .single();

    if (fetchError) {
      console.error("Error fetching existing metadata:", fetchError);
      Sentry.captureException(fetchError, {
        extra: {
          bookmarkId: id,
        },
        tags: {
          operation: "fetch_existing_metadata",
          userId,
        },
      });
      response.status(500).json({
        data: null,
        error: "Error fetching existing metadata",
        success: false,
      });
      return;
    }

    const existingMeta = existing?.meta_data ?? {};

    // Merge: keep existing values if new ones are null/undefined
    const mergedMeta = {
      ...existingMeta,
      ...Object.fromEntries(
        Object.entries(metaData).map(([key, value]) => [key, value ?? existingMeta?.[key]]),
      ),
    };

    meta_data = metaData;

    const { error: DBerror } = await supabase
      .from(MAIN_TABLE_NAME)
      .update({
        description: meta_data?.img_caption ?? "",
        meta_data: mergedMeta,
        ogImage: mediaType?.includes("audio") ? ogImage : publicUrl,
      })
      .match({ id, user_id: userId });

    if (DBerror) {
      console.error("Error updating file metadata:", DBerror);
      Sentry.captureException(DBerror, {
        extra: {
          bookmarkId: id,
        },
        tags: {
          operation: "update_file_metadata",
          userId,
        },
      });
      response.status(500).json({
        data: null,
        error: "Error updating file metadata",
        success: false,
      });
      return;
    }

    // Auto-assign collections (non-critical, handled internally)
    await autoAssignCollections({
      bookmarkId: id,
      matchedCollectionIds,
      route: "upload-file-remaining-data",
      userId,
    });

    // Success
    console.log("File metadata updated successfully:", { bookmarkId: id });
    response.status(200).json({ data: null, error: null, success: true });
  } catch (error) {
    console.error("Unexpected error in upload-file-remaining-data:", error);
    Sentry.captureException(error, {
      tags: {
        operation: "upload_file_remaining_data_unexpected",
      },
    });
    response.status(500).json({
      data: null,
      error: "An unexpected error occurred",
      success: false,
    });
  }
}
