// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { isNil, isNull } from "lodash";
import uniqid from "uniqid";

import type {
  AddBookmarkRemainingDataPayloadTypes,
  NextApiRequest,
  ProfilesTableTypes,
  SingleListData,
} from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";
import type { VerifyErrors } from "jsonwebtoken";

import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";
import { createServerServiceClient } from "@/lib/supabase/service";
import { fetchAiToggles } from "@/utils/ai-feature-toggles";
import { autoAssignCollections, fetchUserCollections } from "@/utils/auto-assign-collections";
import { resolveContentType } from "@/utils/resolve-content-type";

import { imageToText } from "../../../async/ai/imageToText";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  IMAGE_JPEG_MIME_TYPE,
  MAIN_TABLE_NAME,
  R2_MAIN_BUCKET_NAME,
  STORAGE_SCRAPPED_IMAGES_PATH,
} from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import {
  checkIfUrlAnImage,
  checkIfUrlAnMedia,
  getNormalisedImageUrl,
} from "../../../utils/helpers";
import { storageHelpers } from "../../../utils/storageClient";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

interface Data {
  data: null | SingleListData[];
  error: null | PostgrestError | string | VerifyErrors;
  message: null | string;
}

// this uploads all the remaining bookmark data
// these data are blur hash and r2 uploads

export const upload = async (
  base64info: string,
  userIdForStorage: ProfilesTableTypes["id"],
  storagePath: null | string,
): Promise<null | string> => {
  try {
    const imgName = `img-${uniqid?.time()}.jpg`;
    const storagePath_ =
      storagePath ?? `${STORAGE_SCRAPPED_IMAGES_PATH}/${userIdForStorage}/${imgName}`;

    const { error: uploadError } = await storageHelpers.uploadObject(
      R2_MAIN_BUCKET_NAME,
      storagePath_,
      new Uint8Array(decode(base64info)),
      IMAGE_JPEG_MIME_TYPE,
    );

    if (uploadError) {
      Sentry.captureException(`R2 upload failed`);
      console.error("R2 upload failed:", uploadError);
      return null;
    }

    const { data: storageData } = storageHelpers.getPublicUrl(storagePath_);

    return storageData?.publicUrl || null;
  } catch (error) {
    console.error("Error in upload function:", error);
    return null;
  }
};

export default async function handler(
  request: NextApiRequest<AddBookmarkRemainingDataPayloadTypes>,
  response: NextApiResponse<Data>,
) {
  const { id, url } = request.body;

  if (!id) {
    response.status(500).json({ data: null, error: "Id in payload is empty", message: null });
    Sentry.captureException(`Id in payload is empty`);
    return;
  }

  const supabase = apiSupabaseClient(request, response);
  const authResult = await supabase?.auth?.getUser();
  const userId = authResult?.data?.user?.id;

  if (!userId) {
    response.status(401).json({ data: null, error: "User not authenticated", message: null });
    Sentry.captureException("User not authenticated in add-remaining-bookmark-data");
    return;
  }

  // get the current ogImage and meta_data from the database
  // we are got gettin these in query params as that data might not be presnet
  // this is a better solution as we are only getting one row of data
  const { data: currentData, error: currentDataError } = await supabase
    .from(MAIN_TABLE_NAME)
    .select("ogImage, meta_data, description, title, type")
    .match({ id })
    .single();

  if (currentDataError) {
    console.error("Error fetching current bookmark data:", currentDataError);
    response.status(500).json({
      data: null,
      error: "Failed to fetch current bookmark data",
      message: null,
    });
    Sentry.captureException(`Failed to fetch current bookmark data: ${currentDataError.message}`);
    return;
  }

  if (!currentData) {
    response.status(404).json({ data: null, error: "Bookmark not found", message: null });
    Sentry.captureException(`Bookmark not found with id: ${id}`);
    return;
  }

  const aiToggles = await fetchAiToggles({ supabase, userId });
  const userCollections = await fetchUserCollections({
    autoAssignEnabled: aiToggles.autoAssignCollections,
    supabase,
    userId,
  });
  console.log("[add-remaining-bookmark-data] Fetched user collections for auto-assignment:", {
    bookmarkId: id,
    count: userCollections.length,
  });

  let imgData;

  // if a url is an image, then we need to upload it to r2 and store it here
  let uploadedImageThatIsAUrl = null;

  const isUrlAnImage = await checkIfUrlAnImage(url);
  // ***** here we are checking the url is of an image or not,if it is so we upload the image in bucket and url in ogImage*****

  // const isUrlAnImageCondition = !isNil(isUrlAnImage) && !isEmpty(isUrlAnImage);
  const isUrlAnImageCondition = isUrlAnImage;

  if (isUrlAnImageCondition) {
    // if the url itself is an img, like something.com/img.jgp, then we need to upload it to r2
    try {
      // Download the image from the URL
      const realImageUrl = new URL(url)?.searchParams.get("url");

      const image = await axios.get(realImageUrl ?? url, {
        headers: {
          Accept: "image/*,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0",
        },
        responseType: "arraybuffer",
        timeout: 10_000,
      });

      const returnedB64 = Buffer?.from(image?.data)?.toString("base64");
      uploadedImageThatIsAUrl = await upload(returnedB64, userId, null);

      // If upload failed, log but don't fail the entire request
      if (uploadedImageThatIsAUrl === null) {
        console.error("Failed to upload image URL to R2, continuing without image");
        Sentry.captureException("Failed to upload image URL to R2");
      }
    } catch (error) {
      console.error("Error uploading image URL to R2:", error);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { operation: "upload_image_url_to_r2" },
      });

      // Don't fail the entire request, just set imgUrl to null
      uploadedImageThatIsAUrl = null;
    }
  }

  let uploadedCoverImageUrl = null;
  const isUrlAnMedia = await checkIfUrlAnMedia(url);
  const isAudio = currentData?.meta_data?.mediaType?.includes("audio");
  const contentType = resolveContentType({
    mediaType: currentData?.meta_data?.mediaType ?? undefined,
    type: currentData?.type ?? undefined,
  });
  // upload scrapper image to r2
  if (currentData?.ogImage && !isUrlAnMedia) {
    const ogImageNormalisedUrl = await getNormalisedImageUrl(currentData?.ogImage, url);

    try {
      // 10 second timeout for image download
      const image = await axios.get(ogImageNormalisedUrl ?? currentData?.ogImage, {
        // Some servers require headers like User-Agent, especially for images from Open Graph (OG) links.
        headers: {
          Accept: "image/*,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0",
        },
        responseType: "arraybuffer",
        timeout: 10_000,
      });

      const returnedB64 = Buffer.from(image?.data).toString("base64");
      uploadedCoverImageUrl = await upload(returnedB64, userId, null);

      // If upload failed, log but don't fail the entire request
      if (uploadedCoverImageUrl === null) {
        uploadedCoverImageUrl = currentData?.ogImage;
        console.error("Failed to upload image to R2, continuing without image");
        Sentry.captureException("Failed to upload image to R2");
      }
    } catch (error) {
      uploadedCoverImageUrl = currentData?.ogImage;
      console.error("Error uploading scrapped image to R2:", error);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { operation: "upload_scrapped_image_to_r2" },
      });
    }
  }

  let imageOcrValue = null;
  let ocrStatus: "limit_reached" | "no_text" | "success" = "no_text";
  let imageCaption: null | string = null;
  let imageKeywords: Record<string, string> = {};

  //	generate meta data for og image for websites like cosmos, pintrest because they have better ogImage
  const ogImageMetaDataGeneration = uploadedCoverImageUrl ?? currentData?.meta_data?.screenshot;

  // generat meta data (ocr, blurhash data, imgcaption)
  // For audio bookmarks use currentData.ogImage (fallback) so we can run OCR/caption
  let imageUrlForMetaDataGeneration;
  if (isUrlAnImageCondition) {
    imageUrlForMetaDataGeneration = uploadedImageThatIsAUrl;
  } else if (isAudio && currentData?.ogImage) {
    imageUrlForMetaDataGeneration = currentData.ogImage;
  } else {
    imageUrlForMetaDataGeneration = currentData?.meta_data?.screenshot ?? uploadedCoverImageUrl;
  }

  if (!isNil(imageUrlForMetaDataGeneration) || !isNil(ogImageMetaDataGeneration)) {
    try {
      imgData = await blurhashFromURL(
        currentData?.meta_data?.isOgImagePreferred
          ? ogImageMetaDataGeneration
          : imageUrlForMetaDataGeneration,
      );
    } catch (error) {
      console.error("Error generating blurhash:", error);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { operation: "generate_blurhash" },
      });
      imgData = {
        encoded: null,
        height: null,
        width: null,
      };
    }

    try {
      // Determine if the image being analyzed is an OG image or a screenshot
      // isOgImagePreferred sites always use OG image; otherwise check if screenshot exists
      /* oxlint-disable prefer-nullish-coalescing -- boolean fallback: false should trigger right side */
      const isOgImage =
        (currentData?.meta_data?.isOgImagePreferred ?? false) ||
        !currentData?.meta_data?.screenshot;
      /* oxlint-enable prefer-nullish-coalescing */
      const imageToTextResult = await imageToText(
        currentData?.meta_data?.isOgImagePreferred
          ? ogImageMetaDataGeneration
          : imageUrlForMetaDataGeneration,
        supabase,
        userId,
        { contentType, isOgImage },
        {
          collections: userCollections,
          description: currentData?.description,
          title: currentData?.title,
          url,
        },
        aiToggles,
      );
      if (imageToTextResult) {
        imageCaption = imageToTextResult.sentence;
        imageKeywords = imageToTextResult.image_keywords ?? {};
        imageOcrValue = imageToTextResult.ocr_text;
        ocrStatus = imageToTextResult.ocr_text ? "success" : "no_text";

        // Auto-assign collections (non-critical, handled internally)
        await autoAssignCollections({
          bookmarkId: id,
          matchedCollectionIds: imageToTextResult.matched_collection_ids,
          route: "add-remaining-bookmark-data",
          userId,
        });
      }
    } catch (error) {
      console.error("Gemini AI processing error", error);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { operation: "gemini_ai_processing" },
      });
    }
  }

  // Get existing meta_data or create empty object if null
  const existingMetaData = currentData?.meta_data ?? {};

  const meta_data = {
    ...existingMetaData,
    coverImage: uploadedCoverImageUrl,
    height: imgData?.height,
    image_keywords: Object.keys(imageKeywords).length > 0 ? imageKeywords : undefined,
    img_caption: imageCaption,
    ocr: imageOcrValue,
    ocr_status: ocrStatus,
    ogImgBlurUrl: imgData?.encoded,
    width: imgData?.width,
  };

  // Preserve existing ogImage (e.g. audio fallback) when computed value would be null
  const computedOgImage = currentData?.meta_data?.isOgImagePreferred
    ? ogImageMetaDataGeneration
    : imageUrlForMetaDataGeneration;

  const {
    data,
    error: databaseError,
  }: {
    data: null | SingleListData[];
    error: null | PostgrestError | string | VerifyErrors;
  } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({
      description: currentData?.description ?? imageCaption,
      meta_data,
      ogImage: computedOgImage ?? currentData?.ogImage,
    })
    .match({ id })
    .select(`id`);

  if (isNull(data)) {
    console.error("add remaining bookmark data error, return data is empty", databaseError);
    response.status(500).json({ data: null, error: "DB return data is empty", message: null });
    Sentry.captureException(`DB return data is empty`);
    return;
  }

  if (!isNull(databaseError)) {
    console.error("add remaining bookmark data error", databaseError);
    response.status(500).json({ data: null, error: databaseError, message: null });
    Sentry.captureException(`add remaining bookmark data error: ${databaseError?.message}`);
  } else {
    // Revalidate public category pages BEFORE sending response.
    // In serverless, fire-and-forget after res.send() is not reliable—the runtime
    // may terminate before the async work runs, so /revalidate would never be called.
    try {
      const serviceClient = createServerServiceClient();

      const { data: bookmarkCategories } = await serviceClient
        .from(BOOKMARK_CATEGORIES_TABLE_NAME)
        .select("category_id")
        .eq("bookmark_id", id);

      const categoryIds = bookmarkCategories?.map((bc) => bc.category_id) ?? [];

      if (categoryIds.length > 0) {
        console.log("[add-remaining-bookmark-data] Initiating revalidation:", {
          bookmarkId: id,
          categoryIds,
          userId,
        });

        await revalidateCategoriesIfPublic(categoryIds, {
          operation: "update_bookmark_metadata",
          userId,
        });
      } else {
        console.log("[add-remaining-bookmark-data] No categories to revalidate:", {
          bookmarkId: id,
        });
      }
    } catch (error) {
      // Log but do not fail the request—metadata update already succeeded
      console.error("[add-remaining-bookmark-data] Revalidation failed:", {
        bookmarkId: id,
        error,
        errorMessage:
          error instanceof Error
            ? error.message
            : "revalidation failed in add-remaining-bookmark-data",
        userId,
      });
      Sentry.captureException(error, {
        extra: { bookmarkId: id, userId },
        tags: { route: "add-remaining-bookmark-data" },
      });
    }

    response.status(200).json({ data, error: null, message: null });
  }
}
