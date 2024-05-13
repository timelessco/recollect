import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import differenceInDays from "date-fns/differenceInDays";
import { type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import {
	type ClearBookmarksInTrashApiPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	DELETE_BOOKMARK_DATA_API,
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
} from "../../../utils/constants";
import { apiCookieParser } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this api clears trash for a single user and also takes care of CRON job to clear trash every 30 days
type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
	message?: string;
};

export default async function handler(
	request: NextApiRequest<ClearBookmarksInTrashApiPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	if (userId) {
		// this is called by user then they click clear-trash button in UI , hence user_id is being checked
		// this part needs the access_token check as its called from UI and in a userbased action

		// const {
		// 	data,
		// 	error,
		// }: {
		// 	data: SingleListData[] | null;
		// 	error: PostgrestError | VerifyErrors | string | null;
		// } = await supabase
		// 	.from(MAIN_TABLE_NAME)
		// 	.delete()
		// 	.eq("user_id", userId)
		// 	.match({ trash: true })
		// 	.select();

		// if (!isNull(data)) {
		// 	response.status(200).json({ data, error });
		// } else {
		// 	response.status(500).json({ data, error });
		// 	throw new Error("ERROR");
		// }

		// get all trash bookmark ids
		const {
			data: trashBookmarkIds,
			error: trashBookmarkIdError,
		}: {
			data: Array<{
				id: SingleListData["id"];
				ogImage: SingleListData["ogImage"];
				title: SingleListData["title"];
				url: SingleListData["url"];
			}> | null;
			error: PostgrestError | VerifyErrors | string | null;
		} = await supabase
			.from(MAIN_TABLE_NAME)
			.select(`id, ogImage, title, url`)
			.eq("user_id", userId)
			.match({ trash: true });

		if (!isNull(trashBookmarkIdError)) {
			response.status(500).json({ data: null, error: trashBookmarkIdError });
			throw new Error("ERROR: Get trash ids error");
		} else {
			try {
				if (!isNull(trashBookmarkIds)) {
					// call delete bookmark api
					await axios.post(
						`${getBaseUrl()}${NEXT_API_URL}${DELETE_BOOKMARK_DATA_API}`,
						{
							data: { deleteData: trashBookmarkIds },
							user_id: userId,
						},
						{
							headers: {
								Cookie: apiCookieParser(request?.cookies),
							},
						},
					);

					response
						.status(200)
						.json({ data: null, error: null, message: "Deleted bookmarks" });
				} else {
					response.status(500).json({
						data: null,
						error: null,
						message: "Delete bookmark data is null",
					});
					throw new Error("ERROR: Delete bookmark data is null");
				}
			} catch (delError) {
				response
					.status(500)
					.json({ data: null, error: delError as ErrorResponse });
				throw new Error("ERROR: Delete bookmark api error");
			}
		}
	} else {
		// deletes trash for all users , this happens in CRON job
		// this step does not need access token as its called from workflow
		// only if bookmark is older than 30 days fron current date - TODO
		const { data, error } = (await supabase
			.from(MAIN_TABLE_NAME)
			.select("*")
			.match({ trash: true })) as unknown as {
			data: DataResponse;
			error: ErrorResponse;
		};

		if (!isNull(data)) {
			const toBeDeletedIds = data
				?.filter((item) => {
					if (differenceInDays(new Date(), new Date(item?.inserted_at)) >= 29) {
						return true;
					}

					return false;
				})
				?.map((item) => item?.id);

			if (!isEmpty(toBeDeletedIds)) {
				const {
					data: delData,
					error: delError,
				}: {
					data: SingleListData[] | null;
					error: PostgrestError | VerifyErrors | string | null;
				} = await supabase
					.from(MAIN_TABLE_NAME)
					.delete()
					.in("id", toBeDeletedIds)
					.select();

				if (!isNull(delError)) {
					response.status(500).json({ data: delData, error: delError });
					throw new Error("ERROR: del trash error");
				} else {
					response.status(200).json({
						data: delData,
						error: delError,
						message: "CRON success , bookmarks older than 30days deleted",
					});
				}

				return;
			}

			response.status(200).json({
				data: null,
				error: null,
				message: "No bookmarks older than 30 days to delete",
			});
		} else {
			response.status(500).json({ data, error });
			throw new Error("ERROR: del ids error");
		}
	}
}
