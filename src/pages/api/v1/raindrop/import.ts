import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestResponse } from "@supabase/supabase-js";
import { isEmpty } from "lodash";
import slugify from "slugify";

import { sanitizeBookmarks } from "../../../../async/supabaseCrudHelpers";
import { type CategoriesData } from "../../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	PROFILES,
} from "../../../../utils/constants";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

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

	try {
		const { bookmarks } = request.body;

		const categories = [
			...new Set(
				bookmarks
					.filter(
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(bookmark: any) =>
							bookmark.folder && bookmark.folder !== "Unsorted",
					)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.map((bookmark: any) => bookmark.folder),
			),
		];

		const { data: existingCategories, error: existingCategoriesError } =
			await supabase
				.from(CATEGORIES_TABLE_NAME)
				.select("*")
				.in("category_name", categories)
				.in("icon", ["droplets-02"])
				.in("icon_color", ["#ffffff"])
				.eq("user_id", user.id);

		if (existingCategoriesError) {
			throw new Error(existingCategoriesError.message);
		}

		// Get names of folders that already exist
		const existingCategoryNames = new Set(
			existingCategories.map((category) => category.category_name),
		);

		const newCategories = categories.filter(
			(category) => !existingCategoryNames.has(category),
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const categoriesToInsert = newCategories.map((folder: any) => ({
			category_name: folder,
			user_id: user.id,
			category_slug: `${slugify(folder, {
				lower: true,
			})}-${Date.now()}-rain_drop`,
			icon: "droplets-02",
			icon_color: "#ffffff",
		}));

		const {
			data: insertedcategories,
			error: categoriesError,
		}: PostgrestResponse<CategoriesData> = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.insert(categoriesToInsert)
			.select("*");

		if (categoriesError) {
			console.log("error in inserting categories", categoriesError?.message);
			throw new Error(categoriesError.message);
		}

		const collections = [...insertedcategories, ...existingCategories];

		const sanitizedBookmarks = await sanitizeBookmarks(
			bookmarks,
			user.id,
			collections || [],
		);

		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.insert(sanitizedBookmarks)
			.select("*");

		if (error) {
			console.log("Error importing bookmarks", error.message);
			throw new Error(error.message);
		}

		if (insertedcategories && !isEmpty(insertedcategories)) {
			const { data: profileData, error: profileError } = await supabase
				.from(PROFILES)
				.select("category_order")
				.eq("id", user.id)
				.single();

			if (profileError) {
				console.log("Error fetching profile", profileError.message);
				throw new Error(profileError.message);
			}

			const existingOrder = profileData?.category_order ?? [];

			const newIds = insertedcategories.map((item) => item.id);

			const updatedOrder = [...existingOrder, ...newIds];

			const { error: orderError } = await supabase
				.from(PROFILES)
				.update({
					category_order: updatedOrder,
				})
				.eq("id", user.id)
				.select("id, category_order")
				.single();

			if (orderError) {
				console.log("failed to update order", orderError.message);
				throw new Error("Failed to update category order");
			}
		}

		const { error: queueResultsError } = await supabase
			.schema("pgmq_public")
			.rpc("send_batch", {
				queue_name: "ai-embeddings",
				messages: data,
				sleep_seconds: 0,
			});

		if (queueResultsError) {
			console.log(
				"failed to delete message in queue",
				queueResultsError.message,
			);
			throw new Error(queueResultsError.message);
		}

		response.status(200).json({ message: "success", count: data.length });
	} catch (error) {
		console.log("Error importing bookmarks", error);
		Sentry.captureException(error);
		response.status(500).json({ error: "Error importing bookmarks" });
	}
}
