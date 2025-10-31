/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextApiRequest, type NextApiResponse } from "next";

import { MAIN_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	const supabase = apiSupabaseClient(request, response);

	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		response.status(401).json({ error: "Unauthorized user" });
		return;
	}

	const { bookmarks } = request.body;

	const uniqueBookmarks = bookmarks.filter(
		(b: any, index: number, self: any) =>
			b.url && index === self.findIndex((item: any) => item.url === b.url),
	);

	const { data, error } = await supabase
		.from(MAIN_TABLE_NAME)
		.insert(
			uniqueBookmarks.map((bookmark: any) => ({
				...bookmark,
				user_id: user.id,
			})),
		)
		.select("*");

	if (error) {
		response.status(500).json({ error });
		return;
	}

	response.status(200).json({ message: "success", count: data.length });
}
