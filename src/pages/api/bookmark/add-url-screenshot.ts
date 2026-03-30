import type { NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import axios from "axios";

import type {
  AddBookmarkScreenshotPayloadTypes,
  NextApiRequest,
  SingleListData,
} from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";
import type { VerifyErrors } from "jsonwebtoken";

import { env } from "@/env/server";
import { upload } from "@/lib/storage/media-upload";
import { collectAdditionalImages, collectVideo } from "@/utils/helpers";
import { vet } from "@/utils/try";

import {
  ADD_REMAINING_BOOKMARK_API,
  getBaseUrl,
  MAIN_TABLE_NAME,
  NEXT_API_URL,
  SCREENSHOT_API,
} from "../../../utils/constants";
import { getAxiosConfigWithAuth } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

interface Data {
  data: null | SingleListData[];
  error: null | PostgrestError | string | VerifyErrors;
}

const MAX_LENGTH = 1300;

export default async function handler(
  request: NextApiRequest<AddBookmarkScreenshotPayloadTypes>,
  response: NextApiResponse<Data>,
) {
  try {
    const supabase = apiSupabaseClient(request, response);

    // Check for auth errors
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (userError || !userId) {
      console.warn("User authentication failed:", {
        error: userError?.message,
      });
      response.status(401).json({
        data: null,
        error: "Unauthorized",
      });
      return;
    }

    // Entry point log
    console.log("add-url-screenshot API called:", {
      id: request.body.id,
      url: request.body.url,
      userId,
    });

    const [screenshotError, screenShotResponse] = await vet(() =>
      axios.get(`${SCREENSHOT_API}/try?url=${encodeURIComponent(request.body.url)}`, {
        headers: { Authorization: `Bearer ${env.SCREENSHOT_API_SECRET}` },
        responseType: "json",
      }),
    );

    if (screenshotError) {
      console.error("Screenshot API error:", screenshotError);
      Sentry.captureException(screenshotError, {
        extra: { url: request.body.url },
        tags: {
          operation: "screenshot_api",
          userId,
        },
      });

      const requestBody = {
        id: request.body.id,
        url: request.body.url,
      };
      console.log("Calling remaining bookmark data API (screenshot failed):", {
        requestBody,
      });

      const [remainingApiError] = await vet(() =>
        axios.post(
          `${getBaseUrl()}${NEXT_API_URL}${ADD_REMAINING_BOOKMARK_API}`,
          requestBody,
          getAxiosConfigWithAuth(request),
        ),
      );

      if (remainingApiError) {
        console.error("Remaining bookmark data API error:", remainingApiError);
        Sentry.captureException(remainingApiError, {
          extra: {
            bookmarkId: request.body.id,
          },
          tags: {
            operation: "remaining_bookmark_data_api",
            userId,
          },
        });
      }

      response.status(500).json({
        data: null,
        error: "Error capturing screenshot",
      });
      return;
    }

    console.log("Screenshot API response received:", {
      status: screenShotResponse.status,
    });

    const base64data = Buffer?.from(screenShotResponse?.data?.screenshot?.data, "binary")?.toString(
      "base64",
    );

    const { description, isPageScreenshot, title } = screenShotResponse?.data.metaData ?? {};

    const publicURL = await upload(base64data, userId);

    // First, fetch the existing bookmark data to get current meta_data
    const { data: existingBookmarkData, error: fetchError } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("meta_data, ogImage, title, description")
      .match({ id: request.body.id, user_id: userId })
      .single();

    if (fetchError) {
      console.error("Error fetching existing bookmark data:", fetchError);
      Sentry.captureException(fetchError, {
        extra: {
          bookmarkId: request.body.id,
        },
        tags: {
          operation: "fetch_existing_bookmark",
          userId,
        },
      });
      response.status(500).json({
        data: null,
        error: "Error fetching bookmark data",
      });
      return;
    }

    // Log existing bookmark data
    console.log("Existing bookmark data fetched:", {
      hasMetaData: Boolean(existingBookmarkData?.meta_data),
      id: request.body.id,
    });

    // Get existing meta_data or create empty object if null
    const existingMetaData = existingBookmarkData?.meta_data ?? {};

    const updatedTitle = title?.slice(0, MAX_LENGTH) ?? existingBookmarkData?.title;
    const updatedDescription =
      description?.slice(0, MAX_LENGTH) ?? existingBookmarkData?.description;

    const [additionalImagesSettled, additionalVideoSettled] = await Promise.allSettled([
      collectAdditionalImages({
        allImages: screenShotResponse?.data?.allImages,
        userId,
      }),
      collectVideo({
        userId,
        videoUrl: screenShotResponse?.data?.allVideos?.[0] ?? null,
      }),
    ]);

    const additionalImages =
      additionalImagesSettled.status === "fulfilled" ? additionalImagesSettled.value : [];

    if (additionalImagesSettled.status === "rejected") {
      console.warn("Additional images collection failed:", {
        error: additionalImagesSettled.reason,
        userId,
      });
    }

    console.log("Additional images collected:", {
      count: additionalImages.length,
    });

    const additionalVideoResult =
      additionalVideoSettled.status === "fulfilled"
        ? additionalVideoSettled.value
        : {
            error: "unknown" as const,
            message: "collectVideo promise rejected",
            success: false as const,
          };

    if (additionalVideoSettled.status === "rejected") {
      console.warn("Additional video collection failed:", {
        error: additionalVideoSettled.reason,
        userId,
      });
    }

    if (!additionalVideoResult.success) {
      Sentry.captureException(new Error(additionalVideoResult.message), {
        extra: {
          bookmarkId: request.body.id,
          videoUrl: screenShotResponse?.data?.allVideos?.[0],
        },
        tags: {
          errorType: additionalVideoResult.error,
          operation: "collect_video",
          userId,
        },
      });
    }

    // Add screenshot URL to meta_data
    const updatedMetaData = {
      ...existingMetaData,
      additionalImages,
      additionalVideos:
        additionalVideoResult.success && additionalVideoResult.url
          ? [additionalVideoResult.url]
          : [],
      coverImage: existingBookmarkData?.ogImage,
      isPageScreenshot,
      screenshot: publicURL,
    };

    const {
      data,
      error,
    }: {
      data: null | SingleListData[];
      error: null | PostgrestError | string | VerifyErrors;
    } = await supabase
      .from(MAIN_TABLE_NAME)
      // since we now have screenshot , we add that in ogImage as this will now be our primary image, and the existing ogImage (which is the scrapper data image) will be our cover image in meta_data
      .update({
        description: updatedDescription,
        meta_data: updatedMetaData,
        title: updatedTitle,
      })
      .match({ id: request.body.id, user_id: userId })
      .select();

    // Check error immediately - fail fast
    if (error) {
      console.error("Error updating bookmark with screenshot:", error);
      Sentry.captureException(error, {
        extra: {
          bookmarkId: request.body.id,
        },
        tags: {
          operation: "update_bookmark_screenshot",
          userId,
        },
      });
      response.status(500).json({
        data: null,
        error: "Error updating bookmark with screenshot",
      });
      return;
    }

    if (!data || data.length === 0) {
      console.warn("No data returned from the database");
      response.status(500).json({
        data: null,
        error: "No data returned from the database",
      });
      return;
    }

    const requestBody = {
      favIcon: data[0]?.meta_data?.favIcon,
      id: data[0]?.id,
      url: request.body.url,
    };
    console.log("Calling remaining bookmark data API (screenshot succeeded):", {
      requestBody,
    });

    const [remainingApiError] = await vet(() =>
      axios.post(
        `${getBaseUrl()}${NEXT_API_URL}${ADD_REMAINING_BOOKMARK_API}`,
        requestBody,
        getAxiosConfigWithAuth(request),
      ),
    );

    if (remainingApiError) {
      console.error("Remaining bookmark data API error:", remainingApiError);
      Sentry.captureException(remainingApiError, {
        extra: {
          bookmarkId: data[0]?.id,
        },
        tags: {
          operation: "remaining_bookmark_data_api",
          userId,
        },
      });
    }

    // Success log and response
    console.log("Bookmark updated with screenshot successfully:", {
      id: data?.[0]?.id,
    });
    response.status(200).json({ data, error: null });
  } catch (error) {
    console.error("Unexpected error in add-url-screenshot:", error);
    Sentry.captureException(error, {
      tags: {
        operation: "add_url_screenshot_unexpected",
      },
    });
    response.status(500).json({
      data: null,
      error: "An unexpected error occurred",
    });
  }
}
