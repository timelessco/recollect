import axios, { type AxiosResponse } from "axios";

import { AI_SEARCH_API, NEXT_API_URL } from "../../../utils/constants";

/**
 * The ai vector search api call
 *
 * @param {string} query - the string to search by
 * @returns {AxiosResponse<unknown, unknown>}
 */
export const aiSearch = async (
	query: string,
): Promise<AxiosResponse<unknown, unknown>> => {
	const response = await axios.get(
		`${NEXT_API_URL}${AI_SEARCH_API}?query=${query}`,
	);
	return response;
};
