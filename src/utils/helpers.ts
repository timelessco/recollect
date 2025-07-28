import axios from "axios";
import { getYear } from "date-fns";
import { isEmpty } from "lodash";
import find from "lodash/find";
import { type DeepRequired, type FieldErrorsImpl } from "react-hook-form";
import slugify from "slugify";

import { type CardSectionProps } from "../pageComponents/dashboard/cardSection";
import {
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "../types/apiTypes";
import { type UrlInput } from "../types/componentTypes";

import {
	acceptedFileTypes,
	ALL_BOOKMARKS_URL,
	getBaseUrl as BASE_URL,
	bookmarkType,
	documentFileTypes,
	DOCUMENTS_URL,
	FILE_NAME_PARSING_PATTERN,
	GET_NAME_FROM_EMAIL_PATTERN,
	imageFileTypes,
	IMAGES_URL,
	INBOX_URL,
	LINKS_URL,
	menuListItemName,
	SEARCH_URL,
	TRASH_URL,
	TWEETS_URL,
	tweetType,
	UNCATEGORIZED_URL,
	URL_IMAGE_CHECK_PATTERN,
	videoFileTypes,
	VIDEOS_URL,
} from "./constants";

export const getTagAsPerId = (tagIg: number, tagsData: UserTagsData[]) =>
	find(tagsData, (item) => {
		if (item?.id === tagIg) {
			return item;
		}

		return false;
	}) as UserTagsData;

export const getCountInCategory = (
	id: number | string | null,
	allBookmarks: SingleListData[],
) => allBookmarks?.filter((item) => item?.category_id === id)?.length;

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

export const getBaseUrl = (href: string): string => {
	if (typeof href !== "string" || href.trim() === "") return "";

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

export const isUserInACategory = (url: string) => {
	const nonCategoryPages = [
		ALL_BOOKMARKS_URL,
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
		// eslint-disable-next-line unicorn/consistent-function-scoping
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

// this fuction parses cookies that is to be sent in api calls
export const apiCookieParser = (
	cookies: ArrayLike<unknown> | Partial<{ [key: string]: string }>,
) =>
	Object.entries(cookies)
		.map(([key, value]) => `${key}=${value}`)
		.join("; ");

/**
 * Tells if the year is the current year or not
 *
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

export const getMediaType = async (url: string): Promise<string | null> => {
	try {
		const response = await fetch(`${BASE_URL()}/api/bookmark/get-media-type`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ url }),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return data.mediaType || null;
	} catch (error) {
		console.error("Error getting media type:", error);
		return null;
	}
};

// Helper functions if you still need them
export const checkIfUrlAnImage = async (url: string): Promise<boolean> => {
	const mediaType = await getMediaType(url);
	return mediaType?.includes("image/") ?? false;
};

export const checkIfUrlAnMedia = async (url: string): Promise<boolean> => {
	const mediaType = await getMediaType(url);
	return acceptedFileTypes.includes(mediaType ?? "") ?? false;
};
