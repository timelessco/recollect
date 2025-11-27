import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNull } from "lodash";
import ogs from "open-graph-scraper";
import { z } from "zod";

import { canEmbedInIframe } from "../../../async/uploads/iframe-test";
import {
	type ProfilesTableTypes,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	OG_IMAGE_PREFERRED_SITES,
	SHARED_CATEGORIES_TABLE_NAME,
	uncategorizedPages,
} from "../../constants";
import { formatErrorMessage } from "../../error-utils/bookmark-api-error";
import { checkIfUrlAnImage, checkIfUrlAnMedia } from "../../helpers";

export type ScrapperTypes = {
	data: {
		OgImage: string | null;
		description: string | null;
		favIcon: string | null;
		title: string | null;
	};
};

export type ApiErrorResponse = {
	data: null;
	error: string | null;
	message: string | null;
};

export type CheckResult<T> = {
	ok: boolean;
	value?: T;
	error?: string;
	reason?: "error" | "forbidden" | "duplicate";
};

export const getBookmarkBodySchema = () =>
	z.object({
		category_id: z.number().optional().or(z.string().optional()),
		update_access: z.boolean(),
		url: z.string(),
	});

// tells if user is either category owner or collaborator
export const checkIfUserIsCategoryOwnerOrCollaborator = async (
	supabase: SupabaseClient,
	categoryId: SingleListData["category_id"],
	userId: SingleListData["user_id"]["id"],
	email: ProfilesTableTypes["email"],
): Promise<CheckResult<boolean>> => {
	if (categoryId === null) {
		return { ok: true, value: false };
	}

	try {
		const { data: categoryData, error: categoryError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("user_id")
			.eq("id", categoryId);

		if (categoryError) {
			const errorMessage = `Failed to check category ownership: ${formatErrorMessage(
				categoryError,
			)}`;
			console.error(errorMessage, categoryError);
			Sentry.captureException(categoryError, {
				tags: { operation: "check_category_ownership", userId },
				extra: { categoryId, email },
			});
			return { ok: false, reason: "error", error: errorMessage };
		}

		if (categoryData?.[0]?.user_id === userId) {
			return { ok: true, value: true };
		}

		// Check if user is a collaborator
		const { data: shareData, error: shareError } = await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.select("id, edit_access")
			.eq("category_id", categoryId)
			.eq("email", email);

		if (shareError) {
			const errorMessage = `Failed to check collaboration access: ${formatErrorMessage(
				shareError,
			)}`;
			console.error(errorMessage, shareError);
			Sentry.captureException(shareError, {
				tags: { operation: "check_collaboration_access", userId },
				extra: { categoryId, email },
			});
			return { ok: false, reason: "error", error: errorMessage };
		}

		// Return edit access if user is a collaborator
		const hasAccess = !isEmpty(shareData) ? shareData[0]?.edit_access : false;
		return { ok: true, value: hasAccess };
	} catch (error) {
		const errorMessage = `Unexpected error checking user access: ${formatErrorMessage(
			error,
		)}`;
		console.error(errorMessage, error);
		Sentry.captureException(error, {
			tags: { operation: "check_user_access", userId },
			extra: { categoryId, email },
		});
		return { ok: false, reason: "error", error: errorMessage };
	}
};

// Check if bookmark already exists in the category
export const checkIfBookmarkExists = async (
	supabase: SupabaseClient,
	url: string,
	categoryId: number | string,
): Promise<CheckResult<boolean>> => {
	try {
		const {
			data: checkBookmarkData,
			error: checkBookmarkError,
		}: {
			data: Array<{ id: SingleListData["id"] }> | null;
			error: PostgrestError | VerifyErrors | string | null;
		} = await supabase
			.from(MAIN_TABLE_NAME)
			.select(`id`)
			.eq("url", url)
			.eq("category_id", categoryId)
			.eq("trash", false);

		if (!isNull(checkBookmarkError)) {
			const errorMessage = "Failed to check for duplicate bookmark";
			const formattedError = formatErrorMessage(checkBookmarkError);
			console.error(`${errorMessage}:`, checkBookmarkError);
			Sentry.captureException(checkBookmarkError, {
				tags: { operation: "check_bookmark_exists" },
				extra: { url, categoryId },
			});
			return { ok: false, reason: "error", error: formattedError };
		}

		const exists = !isEmpty(checkBookmarkData);
		return { ok: true, value: exists };
	} catch (error) {
		const errorMessage = `Unexpected error checking bookmark existence: ${formatErrorMessage(
			error,
		)}`;
		console.error(errorMessage, error);
		Sentry.captureException(error, {
			tags: { operation: "check_bookmark_exists" },
			extra: { url, categoryId },
		});
		return { ok: false, reason: "error", error: errorMessage };
	}
};

// Scrape metadata from URL
export const scrapeUrlMetadata = async (
	url: string,
): Promise<{
	scraperApiError: string | null;
	scrapperResponse: ScrapperTypes;
}> => {
	let scrapperResponse: ScrapperTypes = {
		data: {
			title: null,
			description: null,
			OgImage: null,
			favIcon: null,
		},
	};

	let scraperApiError = null;

	try {
		const userAgent =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

		const { result: ogScrapperResponse } = await ogs({
			url,
			fetchOptions: {
				headers: { "user-agent": userAgent },
			},
		});

		scrapperResponse = {
			data: {
				title: ogScrapperResponse?.ogTitle ?? null,
				description: ogScrapperResponse?.ogDescription ?? null,
				OgImage: ogScrapperResponse?.ogImage?.[0]?.url ?? null,
				favIcon: ogScrapperResponse?.favicon ?? null,
			},
		};
	} catch (scrapperError) {
		if (scrapperError) {
			scraperApiError = formatErrorMessage(scrapperError);
			console.error("Failed to scrape URL metadata:", scrapperError);
			Sentry.captureException(scrapperError, {
				tags: { operation: "scrape_url_metadata" },
				extra: { url },
			});

			// Fallback to using hostname as title, with safe parsing
			let fallbackTitle: string | null = null;
			try {
				fallbackTitle = new URL(url)?.hostname;
			} catch (urlParseError) {
				// If URL parsing fails, use null as fallback
				console.error("Failed to parse URL for fallback title:", urlParseError);
				Sentry.captureException(urlParseError, {
					tags: { operation: "parse_url_for_fallback_title" },
					extra: { url },
				});
			}

			scrapperResponse = {
				data: {
					title: fallbackTitle,
					description: null,
					OgImage: null,
					favIcon: null,
				},
			};
		}
	}

	return { scrapperResponse, scraperApiError };
};

// Compute the final category ID based on conditions
export const computeCategoryId = (
	updateAccess: boolean,
	categoryId: number | string | null | undefined,
): number =>
	updateAccess === true &&
	!isNull(categoryId) &&
	categoryId !== "null" &&
	categoryId !== 0 &&
	!uncategorizedPages?.includes(categoryId as string)
		? Number(categoryId)
		: 0;

// Process URL and get image/iframe data
export const processUrlMetadata = async (
	url: string,
	isOgImagePreferred: boolean,
	scrapperOgImage: string | null,
) => {
	try {
		let ogImageToBeAdded = null;
		let iframeAllowedValue = null;

		const isUrlOfMimeType = await checkIfUrlAnMedia(url);

		if (isUrlOfMimeType) {
			const isUrlAnImage = await checkIfUrlAnImage(url);
			// Only set ogImage for actual images, not videos/pdf
			ogImageToBeAdded = isUrlAnImage ? url : null;
		} else {
			ogImageToBeAdded = scrapperOgImage;
			// For non-media URLs, check iframe embedding and use OG image
			iframeAllowedValue = isOgImagePreferred
				? false
				: await canEmbedInIframe(url);
			if (!iframeAllowedValue) {
				console.warn(`Iframe embedding not allowed for URL: ${url}`);
			}
		}

		return {
			ogImageToBeAdded,
			iframeAllowedValue,
			isUrlOfMimeType,
		};
	} catch (error) {
		const errorMessage = formatErrorMessage(error);
		console.error("Failed to process URL metadata:", error);
		Sentry.captureException(error, {
			tags: { operation: "process_url_metadata" },
			extra: { url, isOgImagePreferred, scrapperOgImage },
		});
		// Return safe defaults on error
		return {
			ogImageToBeAdded: null,
			iframeAllowedValue: false,
			isUrlOfMimeType: false,
		};
	}
};

// Check if URL is from a preferred OG image site
export const isUrlFromPreferredOgSite = (url: string): boolean => {
	try {
		const urlHost = new URL(url)?.hostname?.toLowerCase();
		return OG_IMAGE_PREFERRED_SITES?.some((keyword) =>
			urlHost?.includes(keyword),
		);
	} catch (error) {
		const errorMessage = formatErrorMessage(error);
		console.error("Failed to check OG image preference:", error);
		Sentry.captureException(error, {
			tags: { operation: "check_og_image_preference" },
			extra: { url },
		});
		return false;
	}
};
