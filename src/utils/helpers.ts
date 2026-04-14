import type { NextApiRequest } from "next";
import router from "next/router";
import type { DeepRequired, FieldErrorsImpl } from "react-hook-form";

import * as Sentry from "@sentry/nextjs";
import { getYear } from "date-fns";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import slugify from "slugify";

import type { CardSectionProps } from "../pageComponents/dashboard/cardSection";
import type { CategoriesData, SingleListData, UserTagsData } from "../types/apiTypes";
import type { UrlInput } from "../types/componentTypes";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { upload, uploadVideo } from "@/lib/storage/media-upload";

import { getMediaType } from "../async/supabaseCrudHelpers";
import {
  AUDIO_MIME_PREFIX,
  AUDIO_URL,
  bookmarkType,
  CATEGORIES_TABLE_NAME,
  DISCOVER_URL,
  DOCUMENT_MIME_TYPES,
  DOCUMENTS_URL,
  EVERYTHING_URL,
  FILE_NAME_PARSING_PATTERN,
  GET_HASHTAG_TAG_PATTERN,
  GET_NAME_FROM_EMAIL_PATTERN,
  IMAGE_MIME_PREFIX,
  IMAGES_URL,
  INBOX_URL,
  INSTAGRAM_URL,
  instagramType,
  isAcceptedMimeType,
  LINKS_URL,
  MAX_VIDEO_SIZE_BYTES,
  menuListItemName,
  SEARCH_URL,
  SHARED_CATEGORIES_TABLE_NAME,
  TAG_MARKUP_REGEX,
  TRASH_URL,
  TWEETS_URL,
  tweetType,
  UNCATEGORIZED_URL,
  VIDEO_DOWNLOAD_TIMEOUT_MS,
  VIDEO_MIME_PREFIX,
  VIDEOS_URL,
} from "./constants";
import { vet } from "./try";
import { getCategorySlugFromRouter } from "./url";

export const getTagAsPerId = (tagIg: number, tagsData: UserTagsData[]) =>
  find(tagsData, (item) => {
    if (item?.id === tagIg) {
      return item;
    }

    return false;
  }) as UserTagsData;

export const getCategoryIdFromSlug = (
  slug: null | string,
  allCategories: CategoriesData[] | undefined,
) => {
  if (
    slug === TRASH_URL ||
    slug === UNCATEGORIZED_URL ||
    slug === IMAGES_URL ||
    slug === VIDEOS_URL ||
    slug === LINKS_URL ||
    slug === DOCUMENTS_URL ||
    slug === TWEETS_URL ||
    slug === INSTAGRAM_URL ||
    slug === AUDIO_URL ||
    slug === DISCOVER_URL
  ) {
    return slug;
  }

  return find(allCategories, (item) => item?.category_slug === slug)?.id;
};

export const urlInputErrorText = (errors: FieldErrorsImpl<DeepRequired<UrlInput>>) => {
  if (errors?.urlText?.type === "pattern") {
    return "Please enter valid URL";
  }

  if (errors?.urlText?.type === "required") {
    return "Please enter URL";
  }

  return "";
};

export const getUserNameFromEmail = (email: string) => {
  if (!isEmpty(email)) {
    // @ts-expect-error- this is a valid regex
    const userName = email?.match(GET_NAME_FROM_EMAIL_PATTERN)[1]?.replace(".", "-");

    return userName;
  }

  return null;
};

export const extractTagNamesFromSearch = (search: string) => {
  const matches =
    typeof search === "string" && search.length > 0 ? search.match(GET_HASHTAG_TAG_PATTERN) : null;

  const tagNames =
    matches && !isEmpty(matches)
      ? matches
          .map((item) => {
            const markupMatch = TAG_MARKUP_REGEX.exec(item);
            const display = markupMatch?.groups?.display;

            return display ?? item.replace("#", "");
          })
          .filter((tag): tag is string => typeof tag === "string" && tag.length > 0)
      : [];

  return tagNames.length > 0 ? tagNames : undefined;
};

export const getBaseUrl = (href: string): string => {
  if (typeof href !== "string" || href.trim() === "") {
    return "";
  }

  try {
    const normalizedHref =
      href.startsWith("http://") || href.startsWith("https://") ? href : `https://${href}`;

    const url = new URL(normalizedHref);
    const baseUrl = url.host;

    return baseUrl;
  } catch (error) {
    console.warn("Error parsing URL:", error);
    return "";
  }
};

export const getNormalisedUrl = (url: string) => {
  if (typeof url !== "string" || url.trim() === "") {
    return null;
  }

  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    if (url.startsWith("//")) {
      return `https:${url}`;
    }

    return null;
  } catch (error) {
    console.warn("Error parsing URL:", error);
    return null;
  }
};

export const isUserInACategory = (url: string) => {
  const nonCategoryPages = [
    EVERYTHING_URL,
    UNCATEGORIZED_URL,
    INBOX_URL,
    SEARCH_URL,
    TRASH_URL,
    IMAGES_URL,
    VIDEOS_URL,
    AUDIO_URL,
    DOCUMENTS_URL,
    LINKS_URL,
    TWEETS_URL,
    INSTAGRAM_URL,
    DISCOVER_URL,
  ];

  return !nonCategoryPages?.includes(url);
};

// checks if one array has all values in another array
export const checker = (array: unknown[], target: unknown[]) =>
  target.every((value: unknown) => array.includes(value));

// gets thumbnail from image, it gets it from the first frame
export const generateVideoThumbnail = (file: File) => {
  const canvas = document.createElement("canvas");
  const video = document.createElement("video");

  // this is important
  video.autoplay = true;
  video.muted = true;
  video.src = URL.createObjectURL(file);

  // eslint-disable-next-line promise/avoid-new -- wrapping callback-based DOM event API
  return new Promise((resolve) => {
    video.addEventListener("loadeddata", () => {
      const element = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      element?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      video.pause();
      resolve(canvas.toDataURL("image/png"));
    });
  });
};

export const isBookmarkVideo = (type: string): boolean => type?.startsWith(VIDEO_MIME_PREFIX);

export const isBookmarkAudio = (type: string): boolean => type?.startsWith(AUDIO_MIME_PREFIX);

export const isBookmarkDocument = (type: string): boolean =>
  (DOCUMENT_MIME_TYPES as readonly string[]).includes(type);

export const isBookmarkImage = (type: string): boolean => type?.startsWith(IMAGE_MIME_PREFIX);

// used in apis to tell if user is in a collection or not
export const isUserInACategoryInApi = (category_id: string, uncategorizedCheck = true): boolean => {
  const condition =
    category_id !== null &&
    category_id !== "null" &&
    category_id !== TRASH_URL &&
    category_id !== IMAGES_URL &&
    category_id !== VIDEOS_URL &&
    category_id !== DOCUMENTS_URL &&
    category_id !== TWEETS_URL &&
    category_id !== LINKS_URL &&
    category_id !== AUDIO_URL &&
    category_id !== instagramType;

  if (uncategorizedCheck) {
    return condition && category_id !== UNCATEGORIZED_URL;
  }
  return condition;
};

// this is the logic for clicking a bookmark card and when the url need to open in new tab
export const clickToOpenInNewTabLogic = (
  event: React.MouseEvent<unknown>,
  url: SingleListData["url"],
  isPublicPage: CardSectionProps["isPublicPage"],
  isDesktop: boolean,
) => {
  event.preventDefault();

  // open on single click
  if (isPublicPage || !isDesktop) {
    window.open(url, "_blank");
  }
};

// based on sent type this will tell what it belongs to, eg if type is application/pdf this function will output Documents
export const fileTypeIdentifier = (type: string) => {
  if (type?.startsWith(IMAGE_MIME_PREFIX)) {
    return menuListItemName?.image;
  }

  if (type?.startsWith(VIDEO_MIME_PREFIX)) {
    return menuListItemName?.videos;
  }

  if (type && (DOCUMENT_MIME_TYPES as readonly string[]).includes(type)) {
    return menuListItemName?.documents;
  }

  if (type === bookmarkType) {
    return menuListItemName?.links;
  }

  if (type === tweetType) {
    return menuListItemName?.tweets;
  }

  return null;
};

const gcd = (...array: number[]): number => {
  const _gcd = (x: number, y: number): number => (!y ? x : gcd(y, x % y));
  let [result] = array;
  for (let i = 1; i < array.length; i += 1) {
    result = _gcd(result, array[i]);
  }
  return result;
};

// gets aspect ratio based on width and height
export const aspectRatio = (width: number, height: number): { height: number; width: number } => {
  const gcdResult = gcd(width, height);

  return {
    height: height / gcdResult,
    width: width / gcdResult,
  };
};

// this parses the file name when uploading something , it removes all the special charecters
export const parseUploadFileName = (name: string): string =>
  slugify(name || "", {
    lower: true,
    remove: FILE_NAME_PARSING_PATTERN,
  });

// tells if file size is less than 10mb, if it returns true then we have hit the upload limit
export const uploadFileLimit = (size: number): boolean =>
  !(Number.parseFloat((size / (1024 * 1024)).toFixed(2)) < 10);

// deletes a browser cookie
export const delete_cookie = (name: string, document: Document) => {
  // oxlint-disable-next-line unicorn/no-document-cookie -- Cookie Store API is async, would change function signature
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
};

// this function parses cookies that is to be sent in api calls
export const apiCookieParser = (cookies: ArrayLike<unknown> | Partial<Record<string, string>>) =>
  Object.entries(cookies)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("; ");

/**
 * Creates axios config with authorization headers and cookies if available
 * Includes both Authorization header (for token-based auth) and Cookie header (for cookie-based auth)
 * when they are present in the request. Returns undefined if neither is available.
 * @param {NextApiRequest} request request object
 * @returns {{ headers: Record<string, string> } | undefined} axios config with headers or undefined
 */
export const getAxiosConfigWithAuth = (
  request: NextApiRequest,
): { headers: Record<string, string> } | undefined => {
  if (!request?.headers?.authorization && !request?.cookies) {
    return undefined;
  }

  return {
    headers: {
      ...(request?.headers?.authorization ? { Authorization: request.headers.authorization } : {}),
      ...(request?.cookies ? { Cookie: apiCookieParser(request.cookies) } : {}),
    },
  };
};

/**
 * Tells if the year is the current year or not
 * @param {string} insertedAt the time to compare
 * @returns {boolean} true if the year of insertedAt matches the current year
 */
export const isCurrentYear = (insertedAt: string) => {
  const date = new Date(insertedAt);

  // Get the current year and the year of the inserted date
  const currentYear = getYear(new Date());
  const insertedYear = getYear(date);

  return insertedYear === currentYear;
};

export const checkIfUrlAnImage = async (url: string): Promise<boolean> => {
  const mediaType = await getMediaType(url);
  return mediaType?.startsWith(IMAGE_MIME_PREFIX) ?? false;
};

export const checkIfUrlAnMedia = async (url: string): Promise<boolean> => {
  const mediaType = await getMediaType(url);
  return isAcceptedMimeType(mediaType);
};

/**
 * Extracts non-empty path segments from a URL path
 * @param path The URL path to process (e.g., from router.asPath)
 * @returns Array of non-empty path segments
 */
export const getPathSegments = (path: string): string[] => (path || "").split("/").filter(Boolean);

/**
 * Checks if the given path is a preview path and extracts the preview ID if it exists
 * @param path The URL path to check
 * @param previewText The preview path segment to look for (default: 'preview')
 * @returns An object containing:
 *   - isPreviewPath: boolean indicating if the path is a preview path
 *   - previewId: the ID from the URL if it's a preview path, null otherwise
 */
export const getPreviewPathInfo = (
  path: string,
  previewText = "preview",
): { isPreviewPath: boolean; previewId: null | string } => {
  const pathSegments = getPathSegments(path);
  const isPreviewPath = pathSegments.length >= 2 && pathSegments.at(-2) === previewText;
  const previewId = isPreviewPath ? (pathSegments.at(-1) ?? null) : null;

  return { isPreviewPath, previewId };
};

/**
 * Determines the appropriate search key based on the current category slug from the URL.
 * @param categoryData - Object containing category data
 * @param categoryData.data - Array of category data to search through
 * @returns number | string | undefined - Returns:
 *   - undefined if the current route is for everything or search
 *   - category ID (number) if a matching category is found
 *   - the original category slug (string) if no matching category is found
 */
export const searchSlugKey = (categoryData: { data: CategoriesData[] }) => {
  // Get the category slug from the current router/URL
  const categorySlug = getCategorySlugFromRouter(router);

  // Special case: return undefined for 'everything' or 'search' routes
  // This matches the behavior of useGetCurrentCategoryId()/CATEGORY_ID
  /* oxlint-disable unicorn/no-useless-undefined */
  if (categorySlug === EVERYTHING_URL || categorySlug === SEARCH_URL) {
    return undefined;
  }
  /* oxlint-enable unicorn/no-useless-undefined */

  // Find the category in the provided data that matches the current slug
  const categoryIdFromSlug = find(
    categoryData?.data,
    (item) => item?.category_slug === categorySlug,
  )?.id;

  // If we found a matching category with a numeric ID, return the ID
  if (typeof categoryIdFromSlug === "number") {
    return categoryIdFromSlug;
  }

  // Fallback: return the original slug if no matching category was found
  return categorySlug;
};

export const getColumnCount = (isDesktop: boolean, colCount?: number) => {
  if (!isDesktop) {
    return 2;
  }

  // If bookmarksColumns is provided, use its first value to determine column count
  const firstColumn = colCount;

  switch (firstColumn) {
    case 10: {
      return 1;
    }
    case 20: {
      return 2;
    }
    case 30: {
      return 3;
    }
    case 40: {
      return 4;
    }
    case 50: {
      return 5;
    }
    case undefined: {
      return 2;
    }
    default: {
      return 1;
    }
  }
};

export const getBookmarkCountForCurrentPage = (
  bookmarkCounts:
    | {
        audio?: number;
        categoryCount?: { category_id: number; count: number }[];
        documents?: number;
        everything?: number;
        images?: number;
        instagram?: number;
        links?: number;
        trash?: number;
        tweets?: number;
        uncategorized?: number;
        videos?: number;
      }
    | undefined,
  categoryId: null | number | string,
): number => {
  if (!bookmarkCounts) {
    return 0;
  }

  // Handle numeric category IDs
  if (typeof categoryId === "number") {
    const category = find(bookmarkCounts.categoryCount, (item) => item?.category_id === categoryId);
    return category?.count ?? 0;
  }

  // Handle special category strings
  switch (categoryId) {
    case AUDIO_URL as unknown as string: {
      return bookmarkCounts.audio ?? 0;
    }
    case DOCUMENTS_URL as unknown as string: {
      return bookmarkCounts.documents ?? 0;
    }
    case IMAGES_URL as unknown as string: {
      return bookmarkCounts.images ?? 0;
    }
    case INSTAGRAM_URL as unknown as string: {
      return bookmarkCounts.instagram ?? 0;
    }
    case LINKS_URL as unknown as string: {
      return bookmarkCounts.links ?? 0;
    }
    case null: {
      return bookmarkCounts.everything ?? 0;
    }
    case TRASH_URL: {
      return bookmarkCounts.trash ?? 0;
    }
    case TWEETS_URL as unknown as string: {
      return bookmarkCounts.tweets ?? 0;
    }
    case UNCATEGORIZED_URL: {
      return bookmarkCounts.uncategorized ?? 0;
    }
    case VIDEOS_URL as unknown as string: {
      return bookmarkCounts.videos ?? 0;
    }
    default: {
      return 0;
    }
  }
};

export const getNormalisedImageUrl = async (imageUrl: null | string, url: string) => {
  try {
    const { hostname } = new URL(url);

    if (imageUrl) {
      // Check for absolute URLs
      const normalisedUrl = getNormalisedUrl(imageUrl);

      if (normalisedUrl) {
        return normalisedUrl;
      }

      return new URL(imageUrl, `https://${hostname}`).href;
    }

    const response = await fetch(
      `https://www.google.com/s2/favicons?sz=128&domain_url=${hostname}`,
    );

    if (!response.ok) {
      throw new Error(`Invalid response for the ${hostname}: ${response.statusText}`);
    }

    return response.url;
  } catch (error) {
    console.warn("Error fetching Image:", error);
    return null;
  }
};

/**
 * Checks if the current user is the owner of the bookmark.
 * @param bookmarkUserId - The user_id object or string from the bookmark data.
 * @param sessionUserId - The ID of the currently logged-in user.
 * @returns boolean - True if the user is the owner, false otherwise.
 */
export const isBookmarkOwner = (
  bookmarkUserId: SingleListData["user_id"] | string | undefined,
  sessionUserId: string | undefined,
): boolean => {
  if (!bookmarkUserId || !sessionUserId) {
    return false;
  }

  // Check if bookmarkUserId is an object with an 'id' property (ProfilesTableTypes)
  if (typeof bookmarkUserId === "object" && "id" in bookmarkUserId) {
    return bookmarkUserId.id === sessionUserId;
  }

  // Check if bookmarkUserId is a string (legacy or direct ID)
  if (typeof bookmarkUserId === "string") {
    return bookmarkUserId === sessionUserId;
  }

  return false;
};

// tells if user is a collaborator for the category
export const isUserCollaboratorInCategory = async (
  supabase: SupabaseClient,
  category_id: string,
  email: string,
): Promise<{
  error?: PostgrestError;
  isCollaborator: boolean;
  success: boolean;
}> => {
  const { data: sharedCategoryData, error: sharedCategoryError } = await supabase
    .from(SHARED_CATEGORIES_TABLE_NAME)
    .select("id")
    .eq("category_id", category_id)
    .eq("email", email);

  if (sharedCategoryError) {
    return {
      error: sharedCategoryError,
      isCollaborator: false,
      success: false,
    };
  }

  return { isCollaborator: !isEmpty(sharedCategoryData), success: true };
};

export const checkIsUserOwnerOfCategory = async (
  supabase: SupabaseClient,
  category_id: string,
  userId: string,
): Promise<{ error?: PostgrestError; isOwner: boolean; success: boolean }> => {
  const { data: categoryData, error: categoryDataError } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select("user_id")
    .eq("id", category_id);

  if (categoryDataError) {
    return {
      error: categoryDataError,
      isOwner: false,
      success: false,
    };
  }

  return { isOwner: categoryData?.[0]?.user_id === userId, success: true };
};

const validateVideoSize = (
  response: Response,
  arrayBuffer: ArrayBuffer,
): { error?: string; isValid: boolean } => {
  // 1KB tolerance for size mismatch
  const SIZE_TOLERANCE_BYTES = 1024;

  // ArrayBuffer size validation (verify downloaded size matches Content-Length)
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const expectedSize = Number.parseInt(contentLength, 10);
    const sizeDiff = Math.abs(arrayBuffer.byteLength - expectedSize);
    if (sizeDiff > SIZE_TOLERANCE_BYTES) {
      return {
        error: `Size mismatch: expected ${expectedSize}, got ${arrayBuffer.byteLength}`,
        isValid: false,
      };
    }
  }

  return { isValid: true };
};

interface CollectVideoArgs {
  userId: string;
  videoUrl: null | string;
}

type CollectVideoErrorType = "network" | "size" | "timeout" | "unknown" | "upload";

type CollectVideoResult =
  | {
      error: CollectVideoErrorType;
      message: string;
      success: false;
    }
  | {
      success: true;
      url: null | string;
    };

const getErrorTypeFromAbortSignal = (error: unknown): CollectVideoErrorType => {
  if (!(error instanceof Error)) {
    return "unknown";
  }

  const { name } = error;
  const message = error.message.toLowerCase();

  if (name === "AbortError" || name === "TimeoutError") {
    return "timeout";
  }

  if (message.includes("aborted") || message.includes("timeout")) {
    return "timeout";
  }

  // Generic fetch/network failures typically surface as TypeError
  if (name === "TypeError") {
    return "network";
  }

  return "unknown";
};

// Domain allowlists matching helpers.server.ts validation
// These are duplicated here to avoid importing server-only dependencies
const ALLOWED_TWITTER_DOMAINS = new Set(["pbs.twimg.com", "video.twimg.com"]);

const ALLOWED_INSTAGRAM_DOMAINS = [".fbcdn.net", ".cdninstagram.com", ".instagram.com"];

/**
 * Checks if a URL is a valid Twitter media URL.
 * Uses the same validation logic as helpers.server.ts validateTwitterMediaUrl.
 * @param urlString - The URL to check
 * @returns boolean - True if the URL is a valid Twitter media URL
 */
export const isTwitterMediaUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && ALLOWED_TWITTER_DOMAINS.has(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Checks if a URL is a valid Instagram media URL.
 * Uses the same validation logic as helpers.server.ts validateInstagramMediaUrl.
 * @param urlString - The URL to check
 * @returns boolean - True if the URL is a valid Instagram media URL
 */
export const isInstagramMediaUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === "https:" &&
      ALLOWED_INSTAGRAM_DOMAINS.some((domain) => url.hostname.endsWith(domain))
    );
  } catch {
    return false;
  }
};

export const collectVideo = async ({
  userId,
  videoUrl,
}: CollectVideoArgs): Promise<CollectVideoResult> => {
  if (!videoUrl) {
    return {
      success: true,
      url: null,
    };
  }

  try {
    // Basic URL validation to avoid fetching non-HTTP(S) schemes
    try {
      const parsedUrl = new URL(videoUrl);

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        const message = "Invalid video URL scheme. Only http and https are allowed.";

        console.warn("[collectVideo] Invalid video URL:", {
          protocol: parsedUrl.protocol,
          userId,
          videoUrl,
        });

        return {
          error: "unknown",
          message,
          success: false,
        };
      }

      // Check if URL is from Twitter or Instagram (allowlist enforcement)
      const isTwitter = isTwitterMediaUrl(videoUrl);
      const isInstagram = isInstagramMediaUrl(videoUrl);

      if (!isTwitter && !isInstagram) {
        const message = "Invalid video URL.";

        console.warn("[collectVideo] URL not allowlisted (must be Twitter or Instagram):", {
          userId,
          videoUrl,
        });

        return {
          error: "unknown",
          message,
          success: false,
        };
      }

      if (isTwitter || isInstagram) {
        console.log("[collectVideo] Detected social media URL:", {
          platform: isTwitter ? "twitter" : "instagram",
          userId,
          videoUrl,
        });
      }
    } catch {
      const message = "Invalid video URL.";

      console.warn("[collectVideo] Failed to parse video URL:", {
        userId,
        videoUrl,
      });

      return {
        error: "unknown",
        message,
        success: false,
      };
    }

    // Fetch with timeout
    const [downloadError, videoResponse] = await vet(() =>
      fetch(videoUrl, {
        method: "GET",
        signal: AbortSignal.timeout(VIDEO_DOWNLOAD_TIMEOUT_MS),
      }),
    );

    if (downloadError || !videoResponse?.ok) {
      const errorMessage = downloadError instanceof Error ? downloadError.message : "Unknown error";
      const errorType = getErrorTypeFromAbortSignal(downloadError);

      console.warn("[collectVideo] Video download failed:", {
        error: errorMessage,
        errorType,
        status: videoResponse?.status,
        userId,
        videoUrl,
      });

      return {
        error: errorType === "unknown" ? "network" : errorType,
        message: `Failed to download video: ${errorMessage}`,
        success: false,
      };
    }

    // Validate content type BEFORE downloading body
    const rawContentType = videoResponse.headers.get("content-type") ?? "";
    const normalizedContentType = rawContentType.split(";")[0].trim().toLowerCase();

    if (!normalizedContentType?.startsWith("video/")) {
      const error = `Invalid video content type: ${rawContentType || "missing"}`;
      console.warn("[collectVideo] Video validation failed:", {
        contentType: rawContentType,
        error,
        userId,
        validationType: "content-type",
        videoUrl,
      });

      return {
        error: "unknown",
        message: error,
        success: false,
      };
    }

    // Validate size BEFORE downloading (check headers first)
    const contentLength = videoResponse.headers.get("content-length");
    if (contentLength) {
      const size = Number.parseInt(contentLength, 10);
      if (size > MAX_VIDEO_SIZE_BYTES) {
        const error = `Video too large: ${size} bytes`;
        console.warn("[collectVideo] Video validation failed:", {
          error,
          size,
          userId,
          validationType: "size",
          videoUrl,
        });
        return {
          error: "size",
          message: error,
          success: false,
        };
      }
    }

    // Download ArrayBuffer (only if size check passed)
    const [arrayBufferError, arrayBuffer] = await vet(() => videoResponse.arrayBuffer());

    if (arrayBufferError || !arrayBuffer) {
      const errorMessage =
        arrayBufferError instanceof Error ? arrayBufferError.message : "Unknown error";
      const errorType = getErrorTypeFromAbortSignal(arrayBufferError);

      console.warn("[collectVideo] Failed to read video array buffer:", {
        error: errorMessage,
        errorType,
        userId,
        videoUrl,
      });

      return {
        error: errorType,
        message: `Failed to get array buffer: ${errorMessage}`,
        success: false,
      };
    }

    // Validate downloaded content size matches Content-Length
    const validation = validateVideoSize(videoResponse, arrayBuffer);
    if (!validation.isValid) {
      console.warn("[collectVideo] Video validation failed:", {
        error: validation.error,
        userId,
        validationType: "size-validation",
        videoUrl,
      });
      return {
        error: "size",
        message: validation.error ?? "Validation failed",
        success: false,
      };
    }

    // Fallback size check when Content-Length was missing
    if (arrayBuffer.byteLength > MAX_VIDEO_SIZE_BYTES) {
      const error = `Video too large (post-download): ${arrayBuffer.byteLength} bytes`;
      console.warn("[collectVideo] Video validation failed:", {
        error,
        size: arrayBuffer.byteLength,
        userId,
        validationType: "size",
        videoUrl,
      });
      return {
        error: "size",
        message: error,
        success: false,
      };
    }

    const [uploadError, uploadedUrl] = await vet(() =>
      uploadVideo(arrayBuffer, userId, normalizedContentType),
    );

    if (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Unknown upload error";

      console.warn("[collectVideo] Video upload to R2 failed:", {
        error: message,
        userId,
        videoUrl,
      });

      return {
        error: "upload",
        message,
        success: false,
      };
    }

    if (!uploadedUrl) {
      console.warn("[collectVideo] Video upload returned empty URL:", {
        userId,
        videoUrl,
      });

      return {
        error: "upload",
        message: "Upload succeeded but returned empty URL",
        success: false,
      };
    }

    return {
      success: true,
      url: uploadedUrl,
    };
  } catch (error) {
    console.warn("[collectVideo] Video upload failed:", {
      error,
      operation: "collect_video",
      userId,
      videoUrl,
    });

    const normalizedError =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : JSON.stringify(error, null, 2));

    Sentry.captureException(normalizedError, {
      extra: {
        videoUrl,
      },
      tags: {
        operation: "collect_video",
        userId,
      },
    });

    return {
      error: "unknown",
      message: error instanceof Error ? error.message : "Unknown error in collectVideo",
      success: false,
    };
  }
};

interface CollectAdditionalImagesArgs {
  allImages?: string[];
  userId: string;
}
export const collectAdditionalImages = async ({
  allImages,
  userId,
}: CollectAdditionalImagesArgs) => {
  if (!allImages?.length) {
    return [];
  }

  const settledImages = await Promise.allSettled(
    allImages.map((b64buffer) => {
      const base64 = Buffer.from(b64buffer, "binary").toString("base64");
      return upload(base64, userId);
    }),
  );

  const failedUploads = settledImages
    .map((result, index) => ({ index, result }))
    .filter(
      ({ result }) =>
        result.status === "rejected" || (result.status === "fulfilled" && result.value === null),
    ) as {
    index: number;
    result: PromiseFulfilledResult<null | string> | PromiseRejectedResult;
  }[];

  if (failedUploads.length > 0) {
    for (const { index, result } of failedUploads) {
      const error =
        result.status === "rejected" ? result.reason : new Error("Image upload returned null URL");

      console.warn("collectAdditionalImages upload failed:", {
        error,
        imageIndex: index,
        operation: "collect_additional_images",
        userId,
      });

      Sentry.addBreadcrumb({
        category: "image-upload",
        data: {
          error: (() => {
            if (error instanceof Error) {
              return error.message;
            }
            if (typeof error === "string") {
              return error;
            }
            return "Unknown error";
          })(),
          index,
          userId,
        },
        level: "warning",
        message: `Image ${index} failed`,
      });
    }

    const successfulUploadsCount = settledImages.filter(
      (result): result is PromiseFulfilledResult<string> =>
        result.status === "fulfilled" && typeof result.value === "string",
    ).length;

    Sentry.captureException(new Error("Image uploads failed"), {
      extra: {
        failureCount: failedUploads.length,
        successCount: successfulUploadsCount,
        totalImages: settledImages.length,
      },
      tags: {
        operation: "collect_additional_images",
        userId,
      },
    });
  }

  return settledImages
    .filter(
      (result): result is PromiseFulfilledResult<string> =>
        result.status === "fulfilled" && typeof result.value === "string",
    )
    .map((fulfilled) => fulfilled.value);
};
