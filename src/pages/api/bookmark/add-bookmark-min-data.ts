// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { verify, type VerifyErrors } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import { isNull } from "lodash";

import {
	type AddBookmarkMinDataPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
	MAIN_TABLE_NAME,
	TIMELESS_SCRAPPER_API,
	UNCATEGORIZED_URL,
} from "../../../utils/constants";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
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

	verify(accessToken, process.env.SUPABASE_JWT_SECRET_KEY, (error) => {
		if (error) {
			response.status(500).json({ data: null, error, message: null });
			throw new Error("ERROR");
		}
	});

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const scrapperResponse = await axios.post<{
		OgImage: string;
		description: string;
		title: string;
	}>(TIMELESS_SCRAPPER_API, {
		url,
	});

	if (
		updateAccess === true &&
		!isNull(categoryId) &&
		categoryId !== "null" &&
		categoryId !== 0 &&
		categoryId !== UNCATEGORIZED_URL
	) {
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
					title: scrapperResponse.data.title,
					user_id: userId,
					description: scrapperResponse?.data?.description,
					ogImage: scrapperResponse?.data?.OgImage,
					category_id: categoryId,
				},
			])
			.select();
		if (!isNull(error)) {
			response.status(500).json({ data: null, error, message: null });
			throw new Error("ERROR");
		} else {
			response.status(200).json({ data, error: null, message: null });
		}
	} else {
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
					category_id: 0,
				},
			])
			.select();

		if (!isNull(error)) {
			response.status(500).json({ data: null, error, message: null });
			throw new Error("ERROR");
		} else {
			response.status(200).json({
				data,
				error: null,
				message:
					updateAccess === false ? ADD_UPDATE_BOOKMARK_ACCESS_ERROR : null,
			});
		}
	}
}
