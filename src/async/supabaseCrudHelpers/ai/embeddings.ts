import axios, { type AxiosResponse } from "axios";

import { type CookiesType, type SingleListData } from "../../../types/apiTypes";
import {
	EMBEDDINGS_DELETE_API,
	EMBEDDINGS_POST_API,
	getBaseUrl,
	NEXT_API_URL,
} from "../../../utils/constants";
import { apiCookieParser } from "../../../utils/helpers";

/**
 * The axios call to create embeddigs
 *
 * @param {Array<SingleListData["id"]>} bookmark_ids the bookmark ids for which the embeddings need to be generated
 * @param {CookiesType} cookies cookie for the api call
 * @returns {Promise<AxiosResponse<unknown, unknown>>}
 */
export const insertEmbeddings = async (
	bookmark_ids: Array<SingleListData["id"]>,
	cookies: CookiesType,
): Promise<AxiosResponse<unknown, unknown>> => {
	const response = await axios.post(
		`${getBaseUrl()}${NEXT_API_URL}${EMBEDDINGS_POST_API}`,
		{
			bookmark_ids,
		},
		{
			headers: {
				Cookie: apiCookieParser(cookies),
			},
		},
	);

	return response;
};

/**
 * The axios call to delete embeddigs
 *
 * @param {Array<SingleListData["id"]>} bookmark_ids the bookmark ids for which the embeddings need to be deleted
 * @param {CookiesType} cookies cookie for the api call
 * @returns {Promise<AxiosResponse<unknown, unknown>>}
 */
export const deleteEmbeddings = async (
	bookmark_ids: Array<SingleListData["id"]>,
	cookies: CookiesType,
	delete_user_embeddings: boolean = false,
) => {
	const response = await axios.delete(
		`${getBaseUrl()}${NEXT_API_URL}${EMBEDDINGS_DELETE_API}`,
		{
			data: {
				bookmark_ids,
				delete_user_embeddings,
			},
			headers: {
				Cookie: apiCookieParser(cookies),
			},
		},
	);

	return response;
};
