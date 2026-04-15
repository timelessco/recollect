// you might want to use regular 'fs' and not a promise one
import type { NextApiRequest, NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { isEmpty } from "lodash";
import isNil from "lodash/isNil";

import type {
  FileNameType,
  ImgMetadataType,
  SingleListData,
} from "../../../../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";
import type { VerifyErrors } from "jsonwebtoken";

import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  getBaseUrl,
  MAIN_TABLE_NAME,
  NEXT_API_URL,
  R2_MAIN_BUCKET_NAME,
  STORAGE_FILES_PATH,
  UPLOAD_FILE_REMAINING_DATA_API,
} from "../../../../../../utils/constants";
import { blurhashFromURL } from "../../../../../../utils/getBlurHash";
import {
  getAxiosConfigWithAuth,
  isUserInACategory,
  parseUploadFileName,
} from "../../../../../../utils/helpers";
import { storageHelpers } from "../../../../../../utils/storageClient";
import { apiSupabaseClient } from "../../../../../../utils/supabaseServerClient";
import { checkIfUserIsCategoryOwnerOrCollaborator } from "../../../../bookmark/add-bookmark-min-data";

// NOTE: THIS API IS ONLY USED IN TEST CASES
// As the upload api needs supabase in the FE and in test cases we cannot use supabase, we use this api which is tailored to be used in test cases
// This api uploads an existing file in the S3 bucket as a new bookmark and this bookmark can be used for testing needs

/*
If the uploaded file is a video then this function is called
This adds the video thumbnail into S3
Then it generates the meta_data for the thumbnail, this data has the blurHash thumbnail
Image caption is not generated for the thumbnail
*/
const videoLogic = async (
  data: {
    category_id: string;
    name: string;
    thumbnailPath: null | string;
    type: string;
    uploadFileNamePath: string;
  },
  userId: SingleListData["user_id"]["id"],
  fileName: FileNameType,
) => {
  // Get the thumbnail path from the client-side upload
  const thumbnailPath = data?.thumbnailPath;

  if (!thumbnailPath) {
    throw new Error("ERROR: thumbnailPath is missing for video file");
  }

  // Move thumbnail from temp location to final location
  const finalThumbnailPath = `${STORAGE_FILES_PATH}/${userId}/thumbnail-${fileName}.png`;

  // For R2, we need to copy the object manually by getting and uploading
  // First get the object from temp location
  const { error: getError } = await storageHelpers.listObjects(R2_MAIN_BUCKET_NAME, thumbnailPath);

  if (!isNil(getError)) {
    throw new Error(`ERROR: getError ${(getError as Error)?.message}`);
  }

  // Since we can't directly copy in R2, we'll assume the thumbnail is already in the right place
  // or handle this differently in a real implementation

  // Delete the temp thumbnail if it exists
  await storageHelpers.deleteObject(R2_MAIN_BUCKET_NAME, thumbnailPath);

  // Get the public URL for the final thumbnail
  const { data: thumbnailUrl, error: thumbnailUrlError } =
    storageHelpers.getPublicUrl(finalThumbnailPath);

  if (!isNil(thumbnailUrlError)) {
    throw new Error(`ERROR: thumbnailUrlError ${String(thumbnailUrlError)}`);
  }

  const ogImage = thumbnailUrl?.publicUrl;

  let imgData;
  if (thumbnailUrl?.publicUrl) {
    try {
      imgData = await blurhashFromURL(thumbnailUrl?.publicUrl);
    } catch (error) {
      console.log("Blur hash error", error);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { operation: "blur_hash" },
      });
      imgData = {};
    }
  }

  const meta_data = {
    coverImage: null,
    favIcon: null,
    height: imgData?.height ?? null,
    iframeAllowed: false,
    image_caption: null,
    img_caption: null,
    isOgImagePreferred: false,
    isPageScreenshot: null,
    mediaType: "",
    ocr: null,
    ogImgBlurUrl: imgData?.encoded ?? null,
    twitter_avatar_url: null,
    video_url: null,
    width: imgData?.width ?? null,
  };

  return { meta_data, ogImage };
};

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<{
    data?:
      | {
          id: SingleListData["id"];
        }[]
      | null;
    error: null | string;
    success: boolean;
  }>,
) {
  const supabase = apiSupabaseClient(request, response);

  const data = request.body as {
    category_id: string;
    name: string;
    thumbnailPath: null | string;
    type: string;
    uploadFileNamePath: string;
  };

  const categoryId = data?.category_id;

  let categoryIdLogic = 0;
  if (categoryId) {
    categoryIdLogic = isUserInACategory(categoryId) ? Number(categoryId) : 0;
  }

  const userData = await supabase?.auth?.getUser();

  const userId = userData?.data?.user?.id;
  const email = userData?.data?.user?.email;

  const fileName = parseUploadFileName(data?.name ?? "");
  const fileType = data?.type;

  const uploadPath = parseUploadFileName(data?.uploadFileNamePath);
  // if the uploaded file is valid this happens
  const storagePath = `${STORAGE_FILES_PATH}/${userId}/${uploadPath}`;

  if (Number.parseInt(categoryId, 10) !== 0 && typeof categoryId === "number") {
    const checkIfUserIsCategoryOwnerOrCollaboratorValue =
      await checkIfUserIsCategoryOwnerOrCollaborator(
        supabase,
        categoryId as number,
        userId!,
        email!,
        response,
      );

    if (!checkIfUserIsCategoryOwnerOrCollaboratorValue) {
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
  const isVideo = fileType?.includes("video");

  let ogImage;

  if (!isVideo) {
    // if file is not a video
    // const { ogImage: image, meta_data: metaData } =
    // 	await notVideoLogic(storageData);

    ogImage = storageData?.publicUrl;
    // meta_data = metaData;
  } else {
    // if file is a video
    const { meta_data: metaData, ogImage: image } = await videoLogic(data, userId!, uploadPath);

    ogImage = image;
    meta_data = metaData;
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
        extra: { bookmarkId: DatabaseData[0].id, categoryId: categoryIdLogic },
        tags: {
          operation: "insert_bookmark_category_junction",
        },
      });
    }
  }

  if (isNil(publicUrlError) && isNil(DBerror)) {
    response.status(200).json({ data: DatabaseData, error: null, success: true });

    try {
      if (!isEmpty(DatabaseData) && !isVideo) {
        await axios.post(
          `${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_REMAINING_DATA_API}`,
          {
            id: DatabaseData[0]?.id,
            publicUrl: storageData?.publicUrl,
          },
          getAxiosConfigWithAuth(request),
        );
      } else {
        console.error("Remaining upload api error: upload data is empty");
        Sentry.captureException(`Remaining upload api error: upload data is empty`);
      }
    } catch (remainingerror) {
      console.error(remainingerror);
      Sentry.captureException(
        remainingerror instanceof Error ? remainingerror : new Error(String(remainingerror)),
        {
          tags: { operation: "remaining_upload_api" },
        },
      );
    }
  } else {
    response.status(500).json({
      error: (publicUrlError ?? DBerror) as string,
      success: false,
    });
  }
}
