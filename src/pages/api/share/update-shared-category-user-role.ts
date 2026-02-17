import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import {
	type CategoriesData,
	type NextApiRequest,
	type UpdateSharedCategoriesUserAccessApiPayload,
} from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

/**
 * Updates user role for a colaborator in a category
 */

type DataResponse = CategoriesData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest<UpdateSharedCategoriesUserAccessApiPayload>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);
	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id as string;
	const email = userData?.data?.user?.email as string;

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.update(request.body.updateData)
			.match({ id: request.body.id })
			.or(`user_id.eq.${userId},email.eq.${email}`)
			.select();

	if (isNull(data)) {
		response.status(500).json({ data, error });
		throw new Error("ERROR");
	} else {
		response.status(200).json({
			data,
			error,
		});
	}
}
