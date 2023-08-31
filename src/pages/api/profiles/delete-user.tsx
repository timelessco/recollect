// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { log } from "console";
import { type NextApiRequest, type NextApiResponse } from "next";
import {
	createClient,
	type AuthError,
	type PostgrestError,
	type User,
} from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import {
	BOOKMARK_TAGS_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	PROFILES,
	SHARED_CATEGORIES_TABLE_NAME,
	TAG_TABLE_NAME,
} from "../../../utils/constants";

// deletes user

type DataResponse = { user: User | null } | null;
type ErrorResponse = AuthError | PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	verify(
		request.body.access_token as string,
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

	const userId = request?.body?.id;
	const email = request?.body?.email;

	// bookmark_tags delete
	const { error: bookmarkTagsError } = await supabase
		.from(BOOKMARK_TAGS_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(bookmarkTagsError)) {
		response.status(500).json({ data: null, error: bookmarkTagsError });
		throw new Error("ERROR");
	} else {
		log("deleted bookmark_tags table data", userId);
	}
	// bookmarks_table delete

	const { error: bookmarksTableError } = await supabase
		.from(MAIN_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(bookmarksTableError)) {
		response.status(500).json({ data: null, error: bookmarksTableError });
		throw new Error("ERROR");
	} else {
		log("deleted bookmarks table data", userId);
	}
	// tags delete

	const { error: tagsError } = await supabase
		.from(TAG_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(tagsError)) {
		response.status(500).json({ data: null, error: tagsError });
		throw new Error("ERROR");
	} else {
		log("deleted tags table data", userId);
	}
	// shared_categories delete (user delete , deletes all categories that the user has created)

	const { error: sharedCategoriesError } = await supabase
		.from(SHARED_CATEGORIES_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(sharedCategoriesError)) {
		response.status(500).json({ data: null, error: sharedCategoriesError });
		throw new Error("ERROR");
	} else {
		log("deleted shared categories table data", userId, "and emails ", email);
	}

	// shared_categories delete (email delete , deletes all categories connections user is part of)

	const { error: sharedCategoriesEmailError } = await supabase
		.from(SHARED_CATEGORIES_TABLE_NAME)
		.delete()
		.eq("email", email);

	if (!isNull(sharedCategoriesEmailError)) {
		response
			.status(500)
			.json({ data: null, error: sharedCategoriesEmailError });
		throw new Error("ERROR");
	} else {
		log(
			"deleted shared categories email table data",
			userId,
			"and emails ",
			email,
		);
	}
	// categories delete

	const { error: categoriesError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(categoriesError)) {
		response.status(500).json({ data: null, error: categoriesError });
		throw new Error("ERROR");
	} else {
		log("deleted categories table data", userId);
	}

	// profile delete
	const { error: profileError } = await supabase
		.from(PROFILES)
		.delete()
		.eq("id", userId);

	if (!isNull(profileError)) {
		response.status(500).json({ data: null, error: profileError });
		throw new Error("ERROR");
	} else {
		log("deleted profiles table data", userId);
	}

	const { data, error } = await supabase.auth.admin.deleteUser(userId);

	if (!isNull(error)) {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	}

	response.status(200).json({ data, error: null });
}
