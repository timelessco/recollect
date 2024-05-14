// disabling as we need complexity of 21 for this task
/* eslint-disable complexity  */
import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNull } from "lodash";
import ogs from "open-graph-scraper";

import {
	type AddBookmarkMinDataPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	ADD_REMAINING_BOOKMARK_API,
	bookmarkType,
	CATEGORIES_TABLE_NAME,
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	SHARED_CATEGORIES_TABLE_NAME,
	uncategorizedPages,
} from "../../../utils/constants";
import { apiCookieParser } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this api get the scrapper data, checks for duplicate bookmarks and then adds it to the DB
type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
};

type ScrapperTypes = {
	data: {
		OgImage: string | null;
		description: string | null;
		favIcon: string | null;
		title: string | null;
	};
};

export default async function handler(
	request: NextApiRequest<AddBookmarkMinDataPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	const { url } = request.body;
	const { category_id: categoryId } = request.body;
	const { update_access: updateAccess } = request.body;

	if (!updateAccess) {
		response.status(500).json({
			data: null,
			error: "User does not have update access",
			message: "User does not have update access",
		});
		return;
	}

	const supabase = apiSupabaseClient(request, response);

	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id;
	const email = userData?.data?.user?.email;

	// when adding a bookmark into a category the same bookmark should not be present in the category
	const checkIfBookmarkAlreadyExists = async () => {
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
			response.status(500).json({
				data: null,
				error: checkBookmarkError,
				message: "Something went wrong in duplicate bookmark category check",
			});
			throw new Error("Duplicate check error");
		}

		return !isEmpty(checkBookmarkData);
	};

	// tells if user is either category owner or collaborator
	const checkIfUserIsCategoryOwnerOrCollaborator = async () => {
		const { data: categoryData, error: categoryError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("user_id")
			.eq("id", categoryId);

		if (categoryError) {
			response
				.status(500)
				.json({ data: null, error: categoryError?.message, message: null });
			Sentry.captureException(
				`checkIfUserIsCategoryOwnerOrCollaborator error: ${categoryError?.message}`,
			);
			return false;
		}

		if (categoryData?.[0]?.user_id === userId) {
			// user is the owner of the category
			return true;
		} else {
			// check if user id a collaborator of the category
			const { data: shareData, error: shareError } = await supabase
				.from(SHARED_CATEGORIES_TABLE_NAME)
				.select("id, edit_access")
				.eq("category_id", categoryId)
				.eq("email", email);

			if (shareError) {
				response
					.status(500)
					.json({ data: null, error: shareError?.message, message: null });
				Sentry.captureException(`share check error: ${shareError?.message}`);
				return false;
			}

			if (!isEmpty(shareData)) {
				// user is a collaborator, if user does not have edit access then return false so that DB is not updated with data
				return shareData?.[0]?.edit_access;
			} else {
				// user is not the owner or the collaborator of the collection
				return false;
			}
		}
	};

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
		const { result: ogScrapperResponse } = await ogs({
			url,
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
			scraperApiError = scrapperError as string;
			Sentry.captureException(`Scrapper error: ${url}`);

			// if scrapper error is there then we just add the url host name as the title and proceed
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

	// this will either be 0 (uncategorized) or any number
	// this also checks if the categoryId is one of the strings mentioned in uncategorizedPages , if they are it will be 0
	const computedCategoryId =
		updateAccess === true &&
		!isNull(categoryId) &&
		categoryId !== "null" &&
		categoryId !== 0 &&
		!uncategorizedPages?.includes(categoryId as string)
			? categoryId
			: 0;

	if (computedCategoryId !== 0) {
		// user is adding bookmark into a category
		const checkIfUserIsCategoryOwnerOrCollaboratorValue =
			await checkIfUserIsCategoryOwnerOrCollaborator();

		if (!checkIfUserIsCategoryOwnerOrCollaboratorValue) {
			response.status(500).json({
				data: null,
				error:
					"User is neither owner or collaborator for the collection or does not have edit access",
				message:
					"User is neither owner or collaborator for the collection does not have edit access",
			});
			return;
		}

		const isBookmarkAlreadyPresentInCategory =
			await checkIfBookmarkAlreadyExists();

		if (isBookmarkAlreadyPresentInCategory) {
			response.status(500).json({
				data: null,
				error: "Bookmark already present in this category",
				message: "Bookmark already present in this category",
			});
			return;
		}
	}

	// here we add the scrapper data , in the remainingApi call we add s3 data
	const {
		data,
		error,
	}: {
		data: SingleListData[] | null;
		error: PostgrestError | VerifyErrors | string | null;
	} = await supabase
		.from(MAIN_TABLE_NAME)
		.insert([
			{
				url,
				title: scrapperResponse?.data?.title,
				user_id: userId,
				description: scrapperResponse?.data?.description,
				ogImage: scrapperResponse?.data?.OgImage,
				category_id: computedCategoryId,
				meta_data: null,
				type: bookmarkType,
			},
		])
		.select();

	if (!isNull(error)) {
		response.status(500).json({ data: null, error, message: null });
		throw new Error("ERROR: add min data error");
	} else {
		response
			.status(200)
			.json({ data, error: scraperApiError ?? null, message: null });

		try {
			if (!isNull(data) && !isEmpty(data)) {
				// this adds the remaining data , like blur hash bucket uploads and all
				await axios.post(
					`${getBaseUrl()}${NEXT_API_URL}${ADD_REMAINING_BOOKMARK_API}`,
					{
						id: data[0]?.id,
						image: scrapperResponse?.data?.OgImage,
						favIcon: scrapperResponse?.data?.favIcon,
						url,
					},
					{
						headers: {
							Cookie: apiCookieParser(request?.cookies),
						},
					},
				);
			} else {
				console.error("Data is empty");
				Sentry.captureException(`Min bookmark data is empty`);
			}
		} catch (remainingUploadError) {
			console.error(remainingUploadError);
			Sentry.captureException(`Remaining api error ${remainingUploadError}`);
		}
	}
}
