import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestResponse } from "@supabase/supabase-js";
import { isEmpty } from "lodash";
import slugify from "slugify";
import uniqid from "uniqid";
import { z } from "zod";

import { sanitizeBookmarks } from "../../../../async/supabaseCrudHelpers";
import { type CategoriesData } from "../../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	PROFILES,
} from "../../../../utils/constants";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

const bookmarkSchema = z.object({
	title: z.string().nullable(),
	description: z.string().nullable(),
	url: z.string().url(),
	ogImage: z.string().nullable(),
	category_name: z.string().nullable(),
});

const requestBodySchema = z.object({
	bookmarks: z.array(bookmarkSchema).min(1, "No bookmarks found in request"),
});

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
		const parseResult = requestBodySchema.safeParse(request.body);

		if (!parseResult.success) {
			console.warn("Invalid request body", parseResult.error);
			response.status(400).json({
				error: "Invalid request body",
			});
			return;
		}

		const { bookmarks } = parseResult.data;

		const categories = [
			...new Set(
				bookmarks
					.filter(
						(bookmark) =>
							bookmark.category_name && bookmark.category_name !== "Unsorted",
					)
					.map((bookmark) => bookmark.category_name as string),
			),
		];

		// get existing categories
		const { data: existingCategories, error: existingCategoriesError } =
			await supabase
				.from(CATEGORIES_TABLE_NAME)
				.select("*")
				.in("category_name", categories)
				.in("icon", ["droplets-02"])
				.in("icon_color", ["#ffffff"])
				.eq("user_id", user.id);

		if (existingCategoriesError) {
			console.warn(
				"Error in getting existing categories",
				existingCategoriesError,
			);
			response.status(500).json({
				error: "Error in getting existing categories",
			});
			return;
		}

		const existingCategoryNames = new Set(
			existingCategories?.map((category) => category.category_name),
		);

		// this is the list of categories that need to be inserted
		const newCategories = categories.filter(
			(category) => !existingCategoryNames.has(category),
		);

		const categoriesToInsert = newCategories.map((category_name) => ({
			category_name,
			user_id: user.id,
			category_slug: `${slugify(category_name, { lower: true })}-rain_drop-${uniqid.time()}}`,
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
			console.warn("Error in inserting categories", categoriesError);
			response.status(500).json({
				error: "Error in inserting categories",
			});
			return;
		}

		const categoriesData = [
			...(insertedcategories || []),
			...(existingCategories || []),
		];

		//* * here we get all other fields required for the bookmark to be inserted in the main table*/
		const sanitizedBookmarks = await sanitizeBookmarks(
			bookmarks,
			user.id,
			categoriesData || [],
		);

		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.insert(sanitizedBookmarks)
			.select("*");

		if (error) {
			console.warn("Error in inserting bookmarks to main table", error);
			response.status(500).json({
				error: "Error in inserting bookmarks",
			});
			return;
		}

		// here the order of the categories is updated
		if (insertedcategories && !isEmpty(insertedcategories)) {
			const { data: profileData, error: profileError } = await supabase
				.from(PROFILES)
				.select("category_order")
				.eq("id", user.id)
				.single();

			if (profileError) {
				console.warn("Error in fetching profile data", profileError);
				response.status(500).json({
					error: "Error in fetching profile data",
				});
				return;
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
				console.warn("Error in updating profile data", orderError);
				response.status(500).json({
					error: "Error in updating profile data",
				});
				return;
			}
		}

		// after the bookmarks are inserted, we need to add them to the queue for ai-enrichment,screenshot,PDF thumbnail generation
		const { error: queueResultsError } = await supabase
			.schema("pgmq_public")
			.rpc("send_batch", {
				queue_name: "ai-embeddings",
				messages: data,
				sleep_seconds: 0,
			});

		if (queueResultsError) {
			console.warn("failed to add message to queue", queueResultsError);
			response.status(500).json({ error: "failed to add message to queue" });
			return;
		}

		response.status(200).json({ message: "success", count: data?.length });
	} catch (error) {
		console.error("Error importing bookmarks", error);
		Sentry.captureException(error);
		response.status(500).json({ error: "Error importing bookmarks" });
	}
}
