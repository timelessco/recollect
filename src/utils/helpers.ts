import { type NextApiRequest } from "next";
import router from "next/router";
import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { getYear } from "date-fns";
import { isEmpty } from "lodash";
import find from "lodash/find";
import { type DeepRequired, type FieldErrorsImpl } from "react-hook-form";
import slugify from "slugify";

import { getMediaType } from "../async/supabaseCrudHelpers";
import { type CardSectionProps } from "../pageComponents/dashboard/cardSection";
import {
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "../types/apiTypes";
import { type UrlInput } from "../types/componentTypes";

import {
	acceptedFileTypes,
	bookmarkType,
	CATEGORIES_TABLE_NAME,
	documentFileTypes,
	DOCUMENTS_URL,
	EVERYTHING_URL,
	FILE_NAME_PARSING_PATTERN,
	GET_HASHTAG_TAG_PATTERN,
	GET_NAME_FROM_EMAIL_PATTERN,
	imageFileTypes,
	IMAGES_URL,
	INBOX_URL,
	LINKS_URL,
	menuListItemName,
	SEARCH_URL,
	SHARED_CATEGORIES_TABLE_NAME,
	TAG_MARKUP_REGEX,
	TRASH_URL,
	TWEETS_URL,
	tweetType,
	UNCATEGORIZED_URL,
	videoFileTypes,
	VIDEOS_URL,
} from "./constants";
import { vet } from "./try";
import { getCategorySlugFromRouter } from "./url";
import { uploadVideo } from "@/pages/api/bookmark/add-url-screenshot";

export const getTagAsPerId = (tagIg: number, tagsData: UserTagsData[]) =>
	find(tagsData, (item) => {
		if (item?.id === tagIg) {
			return item;
		}

		return false;
	}) as UserTagsData;

export const getCategoryIdFromSlug = (
	slug: string | null,
	allCategories: CategoriesData[] | undefined,
) => {
	if (
		slug === TRASH_URL ||
		slug === UNCATEGORIZED_URL ||
		slug === IMAGES_URL ||
		slug === VIDEOS_URL ||
		slug === LINKS_URL ||
		slug === DOCUMENTS_URL ||
		slug === TWEETS_URL
	) {
		return slug;
	}

	if (allCategories) {
		return find(allCategories, (item) => item?.category_slug === slug)?.id;
	}

	return undefined;
};

export const urlInputErrorText = (
	errors: FieldErrorsImpl<DeepRequired<UrlInput>>,
) => {
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
		const userName = email
			?.match(GET_NAME_FROM_EMAIL_PATTERN)[1]
			?.replace(".", "-");

		return userName;
	}

	return null;
};

export const extractTagNamesFromSearch = (search: string) => {
	if (typeof search !== "string" || search.length === 0) {
		return undefined;
	}

	const matches = search.match(GET_HASHTAG_TAG_PATTERN);

	if (!matches || isEmpty(matches)) {
		return undefined;
	}

	const tagNames = matches
		.map((item) => {
			const markupMatch = TAG_MARKUP_REGEX.exec(item);
			const display = markupMatch?.groups?.display;

			if (display) {
				return display;
			}

			return item.replace("#", "");
		})
		.filter((tag): tag is string => typeof tag === "string" && tag.length > 0);

	return isEmpty(tagNames) ? undefined : tagNames;
};

export const getBaseUrl = (href: string): string => {
	if (typeof href !== "string" || href.trim() === "") {
		return "";
	}

	try {
		const normalizedHref =
			href.startsWith("http://") || href.startsWith("https://")
				? href
				: `https://${href}`;

		const url = new URL(normalizedHref);
		const baseUrl = `${url.host}`;

		return baseUrl;
	} catch (error) {
		console.error("Error parsing URL:", error);
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
		DOCUMENTS_URL,
		LINKS_URL,
		TWEETS_URL,
	];

	return !nonCategoryPages?.includes(url);
};

// checks if one array has all values in another array
export const checker = (array: unknown[], target: unknown[]) =>
	target.every((value: unknown) => array.includes(value));

// gets thumbnail from image, it gets it from the first frame
export const generateVideoThumbnail = async (file: File) =>
	await new Promise((resolve) => {
		const canvas = document.createElement("canvas");
		const video = document.createElement("video");

		// this is important
		video.autoplay = true;
		video.muted = true;
		video.src = URL.createObjectURL(file);

		video.onloadeddata = () => {
			const element = canvas.getContext("2d");

			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			element?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
			video.pause();
			resolve(canvas.toDataURL("image/png"));
		};
	});

// tells if the bookmark is of video type
export const isBookmarkVideo = (type: string): boolean =>
	type?.includes("video");

// tells if the bookmark is of audio type
export const isBookmarkAudio = (type: string): boolean =>
	type?.includes("audio");

// tells if the bookmark is of document type
export const isBookmarkDocument = (type: string): boolean =>
	documentFileTypes?.includes(type);

// tells if the bookmark is of image type
export const isBookmarkImage = (type: string): boolean =>
	type?.includes("image");

// used in apis to tell if user is in a collection or not
export const isUserInACategoryInApi = (
	category_id: string,
	uncategorizedCheck: boolean = true,
): boolean => {
	const condition =
		category_id !== null &&
		category_id !== "null" &&
		category_id !== TRASH_URL &&
		category_id !== IMAGES_URL &&
		category_id !== VIDEOS_URL &&
		category_id !== DOCUMENTS_URL &&
		category_id !== TWEETS_URL &&
		category_id !== LINKS_URL;

	if (uncategorizedCheck) {
		return condition && category_id !== UNCATEGORIZED_URL;
	} else {
		return condition;
	}
};

// this is the logic for clicking a bookmark card and when the url need to open in new tab
export const clickToOpenInNewTabLogic = (
	event: React.MouseEvent<unknown, MouseEvent>,
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
	if (imageFileTypes?.includes(type)) {
		return menuListItemName?.image;
	}

	if (videoFileTypes?.includes(type)) {
		return menuListItemName?.videos;
	}

	if (documentFileTypes?.includes(type)) {
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

// gets aspect ratio based on width and height
export const aspectRatio = (
	width: number,
	height: number,
): { height: number; width: number } => {
	const gcd = (...array: number[]): number => {
		const _gcd = (x: number, y: number) => (!y ? x : gcd(y, x % y));
		return [...array].reduce((a, b) => _gcd(a, b));
	};

	const gcdResult = gcd(width, height);

	return {
		width: width / gcdResult,
		height: height / gcdResult,
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
	!(Number.parseFloat((size / (1_024 * 1_024)).toFixed(2)) < 10);

// deletes a browser cookie
export const delete_cookie = (name: string, document: Document) => {
	document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:01 GMT;";
};

// this function parses cookies that is to be sent in api calls
export const apiCookieParser = (
	cookies: ArrayLike<unknown> | Partial<{ [key: string]: string }>,
) =>
	Object.entries(cookies)
		.map(([key, value]) => `${key}=${value}`)
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
			...(request?.headers?.authorization
				? { Authorization: request.headers.authorization }
				: {}),
			...(request?.cookies ? { Cookie: apiCookieParser(request.cookies) } : {}),
		},
	};
};

/**
 * Tells if the year is the current year or not
 * @param {string} insertedAt the time to compare
 * @returns {boolean}
 */
export const isCurrentYear = (insertedAt: string) => {
	const date = new Date(insertedAt);

	// Get the current year and the year of the inserted date
	const currentYear = getYear(new Date());
	const insertedYear = getYear(date);

	return insertedYear === currentYear;
};

// this function returns true if the media type is of image type else false
export const checkIfUrlAnImage = async (url: string): Promise<boolean> => {
	const mediaType = await getMediaType(url);
	return mediaType?.includes("image/") ?? false;
};

// this function returns true if the media type is in the acceptedFileTypes array else false
export const checkIfUrlAnMedia = async (url: string): Promise<boolean> => {
	const mediaType = await getMediaType(url);
	return acceptedFileTypes?.includes(mediaType ?? "") ?? false;
};

/**
 * Extracts non-empty path segments from a URL path
 * @param path The URL path to process (e.g., from router.asPath)
 * @returns Array of non-empty path segments
 */
export const getPathSegments = (path: string): string[] =>
	(path || "").split("/").filter(Boolean);

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
): { isPreviewPath: boolean; previewId: string | null } => {
	const pathSegments = getPathSegments(path);
	const isPreviewPath =
		pathSegments.length >= 2 &&
		pathSegments[pathSegments.length - 2] === previewText;
	const previewId = isPreviewPath
		? pathSegments[pathSegments.length - 1]
		: null;

	return { isPreviewPath, previewId };
};

/**
 * Determines the appropriate search key based on the current category slug from the URL.
 * @param categoryData - Object containing category data
 * @param categoryData.data - Array of category data to search through
 * @param categoryData.error - Optional error object from the data fetch
 * @returns number | string | null - Returns:
 *   - null if the current route is for everything or search
 *   - category ID (number) if a matching category is found
 *   - the original category slug (string) if no matching category is found
 */
export const searchSlugKey = (categoryData: {
	data: CategoriesData[];
	error: PostgrestError;
}) => {
	// Get the category slug from the current router/URL
	const categorySlug = getCategorySlugFromRouter(router);

	// Find the category in the provided data that matches the current slug
	const categoryIdFromSlug = find(
		categoryData?.data,
		(item) => item?.category_slug === categorySlug,
	)?.id;

	// Special case: return null for 'everything' or 'search' routes
	if (categorySlug === EVERYTHING_URL || categorySlug === SEARCH_URL) {
		return null;
	}

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
		case 10:
			return 5;
		case 20:
			return 4;
		case 30:
			return 3;
		case 40:
			return 2;
		case 50:
			return 1;
		case undefined:
			return 2;
		default:
			return 1;
	}
};

export const getBookmarkCountForCurrentPage = (
	bookmarkCounts:
		| {
				categoryCount?: Array<{ category_id: number; count: number }>;
				everything?: number;
				trash?: number;
				uncategorized?: number;
				images?: number;
				videos?: number;
				documents?: number;
				tweets?: number;
				links?: number;
		  }
		| undefined,
	categoryId: string | number | null,
): number => {
	if (!bookmarkCounts) {
		return 0;
	}

	// Handle numeric category IDs
	if (typeof categoryId === "number") {
		const category = find(
			bookmarkCounts.categoryCount,
			(item) => item?.category_id === categoryId,
		);
		return category?.count ?? 0;
	}

	// Handle special category strings
	switch (categoryId) {
		case null:
			return bookmarkCounts.everything ?? 0;
		case TRASH_URL:
			return bookmarkCounts.trash ?? 0;
		case UNCATEGORIZED_URL:
			return bookmarkCounts.uncategorized ?? 0;
		case IMAGES_URL as unknown as string:
			return bookmarkCounts.images ?? 0;
		case VIDEOS_URL as unknown as string:
			return bookmarkCounts.videos ?? 0;
		case DOCUMENTS_URL as unknown as string:
			return bookmarkCounts.documents ?? 0;
		case TWEETS_URL as unknown as string:
			return bookmarkCounts.tweets ?? 0;
		case LINKS_URL as unknown as string:
			return bookmarkCounts.links ?? 0;
		default:
			return 0;
	}
};

export const getNormalisedImageUrl = async (
	imageUrl: string | null,
	url: string,
) => {
	try {
		const { hostname } = new URL(url);

		if (imageUrl) {
			// Check for absolute URLs
			const normalisedUrl = getNormalisedUrl(imageUrl);

			if (normalisedUrl) {
				return normalisedUrl;
			}

			return new URL(imageUrl, `https://${hostname}`).toString();
		}

		const response = await fetch(
			`https://www.google.com/s2/favicons?sz=128&domain_url=${hostname}`,
		);

		if (!response.ok) {
			throw new Error(
				`Invalid response for the ${hostname}: ${response.statusText}`,
			);
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
	success: boolean;
	isCollaborator: boolean;
	error?: PostgrestError;
}> => {
	const { data: sharedCategoryData, error: sharedCategoryError } =
		await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.select("id")
			.eq("category_id", category_id)
			.eq("email", email);

	if (sharedCategoryError) {
		return {
			success: false,
			isCollaborator: false,
			error: sharedCategoryError,
		};
	}

	return { success: true, isCollaborator: !isEmpty(sharedCategoryData) };
};

export const checkIsUserOwnerOfCategory = async (
	supabase: SupabaseClient,
	category_id: string,
	userId: string,
): Promise<{ success: boolean; isOwner: boolean; error?: PostgrestError }> => {
	const { data: categoryData, error: categoryDataError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select("user_id")
		.eq("id", category_id);

	if (categoryDataError) {
		return {
			success: false,
			isOwner: false,
			error: categoryDataError,
		};
	}

	return { success: true, isOwner: categoryData?.[0]?.user_id === userId };
};

const isInstagramVideoUrl = (url: string): boolean => {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname.toLowerCase();
		return (
			hostname.includes("instagram.com") || hostname.includes("instagr.am")
		);
	} catch {
		return false;
	}
};

const validateVideoSize = (
	response: Response,
	arrayBuffer: ArrayBuffer,
): { isValid: boolean; error?: string } => {
	// 1KB tolerance for size mismatch
	const SIZE_TOLERANCE_BYTES = 1024;

	// ArrayBuffer size validation (verify downloaded size matches Content-Length)
	const contentLength = response.headers.get("content-length");
	if (contentLength) {
		const expectedSize = Number.parseInt(contentLength, 10);
		const sizeDiff = Math.abs(arrayBuffer.byteLength - expectedSize);
		if (sizeDiff > SIZE_TOLERANCE_BYTES) {
			return {
				isValid: false,
				error: `Size mismatch: expected ${expectedSize}, got ${arrayBuffer.byteLength}`,
			};
		}
	}

	return { isValid: true };
};

type CollectInstagramVideosArgs = {
	allVideos?: string[];
	userId: string;
};
export const collectInstagramVideos = async ({
	allVideos,
	userId,
}: CollectInstagramVideosArgs) => {
	const MAX_CONCURRENT_VIDEOS = 3;

	// 10MB - matches codebase file upload limit
	const MAX_VIDEO_SIZE_BYTES = 10_485_760;

	if (!allVideos?.length) {
		return [];
	}

	// Filter for Instagram URLs only
	const instagramVideoUrls = allVideos.filter((url) =>
		isInstagramVideoUrl(url),
	);

	if (!instagramVideoUrls.length) {
		return [];
	}

	// Process videos with concurrency limit (3 at a time)
	const settledVideos: Array<PromiseSettledResult<string | null>> = [];

	for (
		let index = 0;
		index < instagramVideoUrls.length;
		index += MAX_CONCURRENT_VIDEOS
	) {
		const batch = instagramVideoUrls.slice(
			index,
			index + MAX_CONCURRENT_VIDEOS,
		);
		const batchResults = await Promise.allSettled(
			batch.map(async (videoUrl) => {
				// Fetch with timeout
				const [downloadError, videoResponse] = await vet(() =>
					fetch(videoUrl, {
						method: "GET",
						signal: AbortSignal.timeout(30_000),
					}),
				);

				if (downloadError || !videoResponse?.ok) {
					const errorMessage =
						downloadError instanceof Error
							? downloadError.message
							: "Unknown error";
					throw new Error(`Failed to download: ${errorMessage}`);
				}

				// Validate size BEFORE downloading (check headers first)
				const contentLength = videoResponse.headers.get("content-length");
				if (contentLength) {
					const size = Number.parseInt(contentLength, 10);
					if (size > MAX_VIDEO_SIZE_BYTES) {
						const error = `Video too large: ${size} bytes`;
						console.warn("Video validation failed:", {
							videoUrl,
							error,
							validationType: "size",
							size,
						});
						Sentry.captureException(new Error(error), {
							tags: {
								operation: "video_content_validation",
								validation_type: "size",
								userId,
							},
							extra: {
								videoUrl,
								contentLength: size,
							},
						});
						// Skip this video
						return null;
					}
				}

				// Download ArrayBuffer (only if size check passed)
				const [arrayBufferError, arrayBuffer] = await vet(() =>
					videoResponse.arrayBuffer(),
				);

				if (arrayBufferError || !arrayBuffer) {
					const errorMessage =
						arrayBufferError instanceof Error
							? arrayBufferError.message
							: "Unknown error";
					throw new Error(`Failed to get array buffer: ${errorMessage}`);
				}

				// Validate downloaded content size matches Content-Length
				const validation = validateVideoSize(videoResponse, arrayBuffer);
				if (!validation.isValid) {
					// Log and send to Sentry
					console.warn("Video validation failed:", {
						videoUrl,
						error: validation.error,
						validationType: "size-validation",
					});
					Sentry.captureException(
						new Error(validation.error || "Validation failed"),
						{
							tags: {
								operation: "video_content_validation",
								validation_type: "size-validation",
								userId,
							},
							extra: {
								videoUrl,
								contentLength: videoResponse.headers.get("content-length"),
								actualSize: arrayBuffer.byteLength,
							},
						},
					);
					// Skip this video
					return null;
				}

				const [uploadError, uploadedUrl] = await vet(() =>
					uploadVideo(arrayBuffer, userId),
				);

				if (uploadError) {
					throw uploadError;
				}

				return uploadedUrl;
			}),
		);
		settledVideos.push(...batchResults);
	}

	const failedUploads = settledVideos
		.map((result, index) => ({ result, index }))
		.filter(({ result }) => result.status === "rejected") as Array<{
		result: PromiseRejectedResult;
		index: number;
	}>;

	if (failedUploads.length > 0) {
		for (const { result, index } of failedUploads) {
			const error = result.reason;

			console.warn("collectInstagramVideos upload failed:", {
				operation: "collect_instagram_videos",
				userId,
				videoIndex: index,
				videoUrl: instagramVideoUrls[index],
				error,
			});

			Sentry.captureException(error, {
				tags: {
					operation: "collect_instagram_videos",
					userId,
				},
				extra: {
					videoIndex: index,
					videoUrl: instagramVideoUrls[index],
				},
			});
		}
	}

	return settledVideos
		.filter(
			(result): result is PromiseFulfilledResult<string | null> =>
				result.status === "fulfilled" && Boolean(result.value),
		)
		.map((fulfilled) => fulfilled.value) as string[];
};
