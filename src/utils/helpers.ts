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
	ALL_BOOKMARKS_URL,
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
	UNCATEGORIZED_URL,
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
		slug === DOCUMENTS_URL
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

export const getBaseUrl = (href: string) => {
	if (href && !isEmpty(href)) {
		const url = new URL(href);
		const baseUrl = `${url.host}`;

		return baseUrl;
	}

	return "";
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
	isTrashPage: boolean,
	isDesktop: boolean,
) => {
	event.preventDefault();

	// open on single click
	if (isPublicPage || !isDesktop) {
		window.open(url, "_blank");
		return;
	}

	// open on double click
	if (event.detail === 2 && !isPublicPage && !isTrashPage) {
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
	slugify(name, {
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
