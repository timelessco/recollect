import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

import {
	type CategoriesData,
	type NextApiRequest,
	type UpdateSharedCategoriesUserAccessApiPayload,
} from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";

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

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.update(request.body.updateData)
			.match({ id: request.body.id })
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
