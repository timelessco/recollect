// you might want to use regular 'fs' and not a promise one
import type { NextApiRequest, NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { isEmpty } from "lodash";

import type { StructuredKeywords, UserCollection } from "../../../async/ai/image-analysis";
import type {
  ImgMetadataType,
  SingleListData,
  UploadFileApiResponse,
} from "../../../types/apiTypes";
import type { AiToggles } from "../../../utils/ai-feature-toggles";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { VerifyErrors } from "jsonwebtoken";

import { imageToText } from "../../../async/ai/image-analysis";
import { getMediaType } from "../../../async/supabaseCrudHelpers";
import { fetchAiToggles } from "../../../utils/ai-feature-toggles";
import {
  autoAssignCollections,
  fetchUserCollections,
} from "../../../utils/auto-assign-collections";
import {
  AUDIO_OG_IMAGE_FALLBACK_URL,
  BOOKMARK_CATEGORIES_TABLE_NAME,
  getBaseUrl,
  MAIN_TABLE_NAME,
  NEXT_API_URL,
  PDF_MIME_TYPE,
  STORAGE_FILES_PATH,
  UPLOAD_FILE_REMAINING_DATA_API,
} from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import {
  getAxiosConfigWithAuth,
  isUserInACategory,
  parseUploadFileName,
} from "../../../utils/helpers";
import { normalizeUploadedMimeType } from "../../../utils/mime";
import { storageHelpers } from "../../../utils/storageClient";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";
import { vet } from "../../../utils/try";
import { checkIfUserIsCategoryOwnerOrCollaborator } from "../bookmark/add-bookmark-min-data";

interface BodyDataType {
  category_id: string;
  name: string;
  thumbnailPath: null | string;
  type: string;
  uploadFileNamePath: string;
}

/*
If the uploaded file is a video then this function is called
This gets the public URL from the thumbnail path uploaded by the client
Then it generates the meta_data for the thumbnail, this data has the blurHash thumbnail
Image caption is not generated for the thumbnail
*/
const videoLogic = async (
  data: BodyDataType,
  supabase: SupabaseClient,
  userId: string,
  aiToggles: AiToggles,
  userCollections: UserCollection[],
) => {
  // Since thumbnails are now uploaded client-side, we just need to get the thumbnail URL
  // The thumbnailPath in data should now be the actual path in R2
  const thumbnailPath = data?.thumbnailPath;

  if (!thumbnailPath) {
    throw new Error("ERROR: thumbnailPath is missing for video file");
  }

  // Get the public URL for the uploaded thumbnail
  const { data: thumbnailUrl } = storageHelpers.getPublicUrl(thumbnailPath);

  const ogImage = thumbnailUrl?.publicUrl;

  let imgData;
  let ocrData: null | string = null;
  let ocrStatus: "limit_reached" | "no_text" | "success" = "no_text";
  let imageCaption: null | string = null;
  let imageKeywords: StructuredKeywords = {};
  let matchedCollectionIds: number[] = [];
  if (thumbnailUrl?.publicUrl) {
    // Handle blurhash generation
    try {
      imgData = await blurhashFromURL(thumbnailUrl?.publicUrl);
    } catch (error) {
      console.error("Blur hash generation failed:", error);
      Sentry.captureException(error, {
        tags: {
          operation: "blurhash_generation",
          thumbnailUrl: thumbnailUrl?.publicUrl,
        },
      });
      imgData = {};
    }

    try {
      const imageToTextResult = await imageToText(
        thumbnailUrl?.publicUrl,
        supabase,
        userId,
        { contentType: "video" },
        { collections: userCollections },
        aiToggles,
      );
      imageCaption = imageToTextResult?.sentence ?? null;
      imageKeywords = imageToTextResult?.image_keywords ?? {};
      matchedCollectionIds = imageToTextResult?.matched_collection_ids ?? [];
      ocrData = imageToTextResult?.ocr_text ?? null;
      ocrStatus = imageToTextResult?.ocr_text ? "success" : "no_text";
    } catch (error) {
      console.error("Image caption generation failed:", error);
      Sentry.captureException(error, {
        tags: {
          operation: "image_caption_generation",
          thumbnailUrl: thumbnailUrl?.publicUrl,
        },
      });
      imageCaption = null;
    }
  }

  const meta_data: ImgMetadataType = {
    coverImage: null,
    favIcon: null,
    height: imgData?.height ?? null,
    iframeAllowed: false,
    image_caption: imageCaption ?? null,
    image_keywords: Object.keys(imageKeywords).length > 0 ? imageKeywords : undefined,
    img_caption: imageCaption ?? null,
    isOgImagePreferred: false,
    isPageScreenshot: null,
    mediaType: "",
    ocr: ocrData ?? null,
    ocr_status: ocrStatus,
    ogImgBlurUrl: imgData?.encoded ?? null,
    screenshot: null,
    twitter_avatar_url: null,
    video_url: null,
    width: imgData?.width ?? null,
  };

  return { matchedCollectionIds, meta_data, ogImage };
};

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<UploadFileApiResponse>,
) {
  try {
    const supabase = apiSupabaseClient(request, response);

    // Check for auth errors
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const email = userData?.user?.email;

    if (userError || !userId) {
      console.warn("User authentication failed:", {
        error: userError?.message,
      });
      response.status(401).json({
        error: "Unauthorized",
        success: false,
      });
      return;
    }

    // Get data from JSON body
    const data = request.body as BodyDataType;
    const categoryId = data?.category_id;
    let categoryIdLogic = 0;
    if (categoryId) {
      categoryIdLogic = isUserInACategory(categoryId) ? Number(categoryId) : 0;
    }

    const fileName = parseUploadFileName(data?.name ?? "");
    const fileType = normalizeUploadedMimeType(data?.type);

    console.log("upload-file API called:", {
      categoryId,
      fileName,
      fileType,
      userId,
    });

    const uploadPath = parseUploadFileName(data?.uploadFileNamePath);
    // if the uploaded file is valid this happens
    const storagePath = `${STORAGE_FILES_PATH}/${userId}/${uploadPath}`;

    if (Number.parseInt(categoryId, 10) !== 0 && typeof categoryId === "number") {
      const checkIfUserIsCategoryOwnerOrCollaboratorValue =
        await checkIfUserIsCategoryOwnerOrCollaborator(
          supabase,
          categoryId as number,
          userId,
          email!,
          response,
        );

      if (!checkIfUserIsCategoryOwnerOrCollaboratorValue) {
        console.warn("User authorization failed for category:", { categoryId });
        response.status(500).json({
          error:
            "User is neither owner or collaborator for the collection or does not have edit access",
          success: false,
        });
        return;
      }
    }

    // NOTE: the file upload to the bucket takes place in the client side itself due to vercel 4.5mb constraint https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions
    // the public url for the uploaded file is got
    const { data: storageData, error: publicUrlError } = storageHelpers.getPublicUrl(storagePath);

    // Check for public URL error immediately
    if (publicUrlError) {
      console.error("Error getting public URL:", publicUrlError);
      Sentry.captureException(publicUrlError, {
        extra: {
          storagePath,
        },
        tags: {
          operation: "get_public_url",
          userId,
        },
      });
      response.status(500).json({
        error: "Error getting file URL",
        success: false,
      });
      return;
    }

    const mediaType = (await getMediaType(storageData?.publicUrl))!;

    let meta_data: ImgMetadataType = {
      coverImage: null,
      favIcon: null,
      height: null,
      iframeAllowed: false,
      image_caption: null,
      img_caption: null,
      isOgImagePreferred: false,
      isPageScreenshot: null,
      mediaType,
      ocr: null,
      ogImgBlurUrl: null,
      screenshot: null,
      twitter_avatar_url: null,
      video_url: null,
      width: null,
    };
    const isVideo = fileType?.includes("video");

    const isAudio = fileType?.includes("audio");

    const isPdf = fileType === PDF_MIME_TYPE;

    const aiToggles = await fetchAiToggles({ supabase, userId });
    const userCollections = await fetchUserCollections({
      autoAssignEnabled: aiToggles.autoAssignCollections,
      supabase,
      userId,
    });
    let ogImage;
    let videoMatchedCollectionIds: number[] = [];

    if (!isVideo) {
      // if file is not a video
      ogImage = storageData?.publicUrl;
      if (isAudio) {
        console.log("Setting audio ogImage fallback:", {
          fileType,
        });
        ogImage = AUDIO_OG_IMAGE_FALLBACK_URL;
      } else if (isPdf && data.thumbnailPath) {
        // Use client-uploaded thumbnail for PDFs (mobile flow)
        console.log("Using client-uploaded PDF thumbnail:", {
          thumbnailPath: data.thumbnailPath,
        });
        const { data: thumbData } = storageHelpers.getPublicUrl(data.thumbnailPath);
        if (thumbData?.publicUrl) {
          ogImage = thumbData.publicUrl;
        }
      }
    } else {
      // if file is a video
      console.log("Processing video file:", {
        thumbnailPath: data.thumbnailPath,
      });

      const {
        matchedCollectionIds,
        meta_data: metaData,
        ogImage: image,
      } = await videoLogic(data, supabase, userId ?? "", aiToggles, userCollections);

      ogImage = image;
      meta_data = metaData;
      videoMatchedCollectionIds = matchedCollectionIds;
    }

    // we upload the final data in DB
    const { data: DatabaseData, error: DBerror } = (await supabase
      .from(MAIN_TABLE_NAME)
      .insert([
        {
          description: meta_data?.img_caption ?? "",
          meta_data,
          ogImage,
          title: fileName,
          type: fileType,
          url: storageData?.publicUrl,
          user_id: userId,
        },
      ])
      .select(`id`)) as unknown as {
      data: { id: SingleListData["id"] }[];
      error: null | PostgrestError | string | VerifyErrors;
    };

    console.log("Database insert result:", {
      bookmarkId: DatabaseData?.[0]?.id,
    });

    if (DBerror) {
      console.error("Error inserting file to database:", DBerror);
      Sentry.captureException(DBerror, {
        extra: { fileName, fileType },
        tags: {
          operation: "insert_file_to_database",
          userId,
        },
      });
      response.status(500).json({ error: "Error uploading file", success: false });
      return;
    }

    // Add category association via junction table
    if (DatabaseData?.[0]?.id) {
      const { error: junctionError } = await supabase.from(BOOKMARK_CATEGORIES_TABLE_NAME).insert({
        bookmark_id: DatabaseData[0].id,
        category_id: categoryIdLogic,
        user_id: userId,
      });

      if (junctionError) {
        console.error("Error inserting category association:", junctionError);
        Sentry.captureException(junctionError, {
          extra: {
            bookmarkId: DatabaseData[0].id,
            categoryId: categoryIdLogic,
          },
          tags: {
            operation: "insert_bookmark_category_junction",
            userId,
          },
        });
      }
    }

    // Skip remaining upload API for PDFs
    if (fileType === PDF_MIME_TYPE) {
      console.log("File type is pdf, so not calling the remaining upload api");
      response.status(200).json({ data: DatabaseData, error: null, success: true });
      return;
    }

    // Skip remaining upload API for videos or empty data
    if (isEmpty(DatabaseData) || isVideo) {
      // Auto-assign collections for video files (non-critical)
      if (isVideo && DatabaseData?.[0]?.id) {
        await autoAssignCollections({
          bookmarkId: DatabaseData[0].id,
          matchedCollectionIds: videoMatchedCollectionIds,
          route: "upload-file",
          userId,
        });
      }

      console.log("File type is video or no data, so not calling the remaining upload api");
      response.status(200).json({ data: DatabaseData, error: null, success: true });
      return;
    }

    // Call remaining upload API
    const remainingUploadBody = {
      id: DatabaseData[0]?.id,
      mediaType: meta_data?.mediaType,
      publicUrl: storageData?.publicUrl,
    };
    console.log("Calling remaining upload API:", { remainingUploadBody });

    const [remainingUploadError] = await vet(() =>
      axios.post(
        `${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_REMAINING_DATA_API}`,
        remainingUploadBody,
        getAxiosConfigWithAuth(request),
      ),
    );

    if (remainingUploadError) {
      console.error("Remaining upload API error:", remainingUploadError);
      Sentry.captureException(remainingUploadError, {
        extra: {
          bookmarkId: DatabaseData[0]?.id,
        },
        tags: {
          operation: "remaining_upload_api",
          userId,
        },
      });
    }

    console.log("File uploaded successfully:", {
      bookmarkId: DatabaseData?.[0]?.id,
    });
    response.status(200).json({ data: DatabaseData, error: null, success: true });
  } catch (error) {
    console.error("Unexpected error in upload-file:", error);
    Sentry.captureException(error, {
      tags: {
        operation: "upload_file_unexpected",
      },
    });
    response.status(500).json({
      error: "An unexpected error occurred",
      success: false,
    });
  }
}
