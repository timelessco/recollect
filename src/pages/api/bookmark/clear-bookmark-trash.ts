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
import { getAxiosConfigWithAuth } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this api clears trash for a single user and also takes care of CRON job to clear trash every 30 days

const BATCH_SIZE = 1000;

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
		// this is called by user when they click clear-trash button in UI
		// this part needs the access_token check as its called from UI and is a user-based action

		let totalDeleted = 0;

		try {
			// Loop: fetch up to BATCH_SIZE trashed IDs, delete them, repeat until none left.
			// Supabase has a default row limit of 1000, so a single query may not return all rows.
			while (true) {
				const {
					data: trashBookmarkIds,
					error: trashBookmarkIdError,
				}: {
					data: Array<{ id: SingleListData["id"] }> | null;
					error: PostgrestError | VerifyErrors | string | null;
				} = await supabase
					.from(MAIN_TABLE_NAME)
					.select(`id`)
					.eq("user_id", userId)
					.not("trash", "is", null)
					.limit(BATCH_SIZE);

				if (!isNull(trashBookmarkIdError)) {
					response
						.status(500)
						.json({ data: null, error: trashBookmarkIdError });
					throw new Error("ERROR: Get trash ids error");
				}

				if (isNull(trashBookmarkIds) || trashBookmarkIds.length === 0) {
					break;
				}

				await axios.post(
					`${getBaseUrl()}${NEXT_API_URL}${DELETE_BOOKMARK_DATA_API}`,
					{
						data: { deleteData: trashBookmarkIds },
						user_id: userId,
					},
					getAxiosConfigWithAuth(request),
				);

				totalDeleted += trashBookmarkIds.length;

				// If we got fewer than BATCH_SIZE, there are no more left
				if (trashBookmarkIds.length < BATCH_SIZE) {
					break;
				}
			}

			response.status(200).json({
				data: null,
				error: null,
				message:
					totalDeleted > 0
						? `Deleted ${totalDeleted} bookmarks`
						: "No bookmarks in trash to delete",
			});
		} catch (delError) {
			response
				.status(500)
				.json({ data: null, error: delError as ErrorResponse });
			throw new Error("ERROR: Delete bookmark api error");
		}
	} else {
		// deletes trash for all users , this happens in CRON job
		// this step does not need access token as its called from workflow
		// only if bookmark is older than 30 days fron current date - TODO
		const { data, error } = (await supabase
			.from(MAIN_TABLE_NAME)
			.select("*")
			.not("trash", "is", null)) as unknown as {
			data: DataResponse;
			error: ErrorResponse;
		};

		if (!isNull(data)) {
			const toBeDeletedIds = data
				?.filter((item) => {
					if (
						item?.trash &&
						differenceInDays(new Date(), new Date(item.trash)) >= 29
					) {
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
