import { type NextApiResponse } from "next/dist/shared/lib/utils";
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
import { checkIfUrlAnImage, checkIfUrlAnMedia } from "../../helpers";

import { formatErrorMessage } from "./errorHandling";

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

export const getBookmarkBodySchema = () =>
	z.object({
		category_id: z.number().optional().or(z.string().optional()),
		update_access: z.boolean(),
		url: z.string(),
	});

// Helper to send error response
const sendErrorResponse = (
	response: NextApiResponse,
	status: number,
	error: string,
	message: string = error,
): void => {
	response.status(status).json({ data: null, error, message });
};

// tells if user is either category owner or collaborator
export const checkIfUserIsCategoryOwnerOrCollaborator = async (
	supabase: SupabaseClient,
	categoryId: SingleListData["category_id"],
	userId: SingleListData["user_id"]["id"],
	email: ProfilesTableTypes["email"],
	response: NextApiResponse,
): Promise<boolean> => {
	try {
		const { data: categoryData, error: categoryError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("user_id")
			.eq("id", categoryId);

		if (categoryError) {
			const errorMessage = `Failed to check category ownership: ${formatErrorMessage(
				categoryError,
			)}`;
			sendErrorResponse(response, 500, errorMessage);
			Sentry.captureException(errorMessage);
			return false;
		}

		if (categoryData?.[0]?.user_id === userId) {
			return true;
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
			sendErrorResponse(response, 500, errorMessage);
			Sentry.captureException(errorMessage);
			return false;
		}

		// Return edit access if user is a collaborator
		return !isEmpty(shareData) ? shareData[0]?.edit_access : false;
	} catch (error) {
		const errorMessage = `Unexpected error checking user access: ${formatErrorMessage(
			error,
		)}`;
		sendErrorResponse(response, 500, errorMessage);
		Sentry.captureException(errorMessage);
		return false;
	}
};

// Check if bookmark already exists in the category
export const checkIfBookmarkExists = async (
	supabase: SupabaseClient,
	url: string,
	categoryId: number | string,
	response: NextApiResponse,
): Promise<boolean> => {
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
			sendErrorResponse(response, 500, errorMessage, formattedError);
			Sentry.captureException(`${errorMessage}: ${formattedError}`);
			return false;
		}

		return !isEmpty(checkBookmarkData);
	} catch (error) {
		const errorMessage = `Unexpected error checking bookmark existence: ${formatErrorMessage(
			error,
		)}`;
		sendErrorResponse(response, 500, errorMessage);
		Sentry.captureException(errorMessage);
		return false;
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
			Sentry.captureException(`Failed to scrape URL metadata: ${url}`, {
				extra: { error: scraperApiError },
			});

			// Fallback to using hostname as title
			scrapperResponse = {
				data: {
					title: new URL(url)?.hostname,
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
		? (categoryId as number)
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
		Sentry.captureException(`Failed to process URL metadata: ${url}`, {
			extra: { error: errorMessage },
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
		Sentry.captureException(`Failed to check OG image preference: ${url}`, {
			extra: { error: errorMessage },
		});
		return false;
	}
};
