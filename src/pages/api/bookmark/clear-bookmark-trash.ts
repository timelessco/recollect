import { type NextApiResponse } from "next";
import {
	createClient,
	type PostgrestError,
	type Session,
} from "@supabase/supabase-js";
import differenceInDays from "date-fns/differenceInDays";
import { verify, type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import { deleteData } from "../../../async/supabaseCrudHelpers";
import {
	type ClearBookmarksInTrashApiPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../utils/constants";

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
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	if (request.body.user_id) {
		// this is called by user then they click clear-trash button in UI , hence user_id is being checked
		// this part needs the access_token check as its called from UI and in a userbased action

		verify(
			request.body.access_token,
			process.env.SUPABASE_JWT_SECRET_KEY,
			(error_) => {
				if (error_) {
					response.status(500).json({ data: null, error: error_ });
					throw new Error("ERROR");
				}
			},
		);

		// const {
		// 	data,
		// 	error,
		// }: {
		// 	data: SingleListData[] | null;
		// 	error: PostgrestError | VerifyErrors | string | null;
		// } = await supabase
		// 	.from(MAIN_TABLE_NAME)
		// 	.delete()
		// 	.eq("user_id", request.body.user_id)
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
			}> | null;
			error: PostgrestError | VerifyErrors | string | null;
		} = await supabase
			.from(MAIN_TABLE_NAME)
			.select(`id, ogImage, title`)
			.eq("user_id", request.body.user_id)
			.match({ trash: true });

		if (!isNull(trashBookmarkIdError)) {
			response.status(500).json({ data: null, error: trashBookmarkIdError });
			throw new Error("ERROR: Get trash ids error");
		} else {
			try {
				if (!isNull(trashBookmarkIds)) {
					// call delete bookmark api
					await deleteData({
						deleteData: trashBookmarkIds,
						session: { access_token: request?.body?.access_token } as Session,
					});

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
					throw new Error("ERROR");
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
			throw new Error("ERROR");
		}
	}
}
