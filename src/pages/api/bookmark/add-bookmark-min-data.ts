// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { type VerifyErrors } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
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
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	uncategorizedPages,
} from "../../../utils/constants";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

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
	const accessToken = request.body.access_token;
	const { url } = request.body;
	const { category_id: categoryId } = request.body;
	const { update_access: updateAccess } = request.body;
	const tokenDecode: { sub: string } = jwtDecode(accessToken);
	const userId = tokenDecode?.sub;

	const { error: _error } = verifyAuthToken(accessToken);

	if (_error) {
		response.status(500).json({ data: null, error: _error, message: null });
		throw new Error("ERROR: token error");
	}

	const supabase = apiSupabaseClient();

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
			.eq("category_id", categoryId);

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
			scraperApiError = scrapperError as VerifyErrors;
			console.error("ERROR: scrapper error");
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
		const isBookmarkAlreadyPresentInCategory =
			await checkIfBookmarkAlreadyExists();

		if (isBookmarkAlreadyPresentInCategory) {
			response.status(500).json({
				data: null,
				error: "Bookmark already present in this category",
				message: "Bookmark already present in this category",
			});
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
						access_token: accessToken,
						url,
					},
				);
			} else {
				console.error("Data is empty");
			}
		} catch (remainingUploadError) {
			console.error(remainingUploadError);
		}
	}
}
