import { isEmpty } from "lodash";
import find from "lodash/find";
import { type DeepRequired, type FieldErrorsImpl } from "react-hook-form";

import {
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "../types/apiTypes";
import { type UrlInput } from "../types/componentTypes";

import {
	ALL_BOOKMARKS_URL,
	GET_NAME_FROM_EMAIL_PATTERN,
	IMAGES_URL,
	INBOX_URL,
	LINKS_URL,
	SEARCH_URL,
	TRASH_URL,
	UNCATEGORIZED_URL,
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
		slug === LINKS_URL
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
