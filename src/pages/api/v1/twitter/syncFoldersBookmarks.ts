import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { isEmpty } from "lodash";
import { z } from "zod";

import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	tweetType,
} from "../../../../utils/constants";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

// Zod schema for request body validation
const requestSchema = z.object({
	data: z
		.array(
			z.object({
				category_name: z.string().min(1, "Category name is required"),
				url: z.string().url("Invalid URL format"),
			}),
		)
		.min(1, "At least one item required"),
});

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	// Allow only POST
	if (request.method !== "POST") {
		response.status(405).json({ error: "Method Not Allowed" });
		return;
	}

	// Validate request body
	const parseResult = requestSchema.safeParse(request.body);
	if (!parseResult.success) {
		response
			.status(400)
			.json({ error: parseResult.error.format(), data: null });
		return;
	}

	const { data } = parseResult.data;
	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	if (!userId || isEmpty(userId)) {
		response.status(401).json({ data: null, error: "User id is missing" });
		return;
	}

	// Load categories once; resolve by case-insensitive trimmed name
	const { data: existingCategories, error: categoriesError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select("id, category_name")
		.eq("user_id", userId);

	if (categoriesError) {
		console.error("[twitter/syncFoldersBookmarks] Error fetching categories:", {
			error: categoriesError,
			userId,
		});
		response.status(500).json({
			data: null,
			error: "Failed to fetch categories",
		});
		return;
	}

	const categoryMap = new Map<string, { id: number }>();
	for (const row of existingCategories ?? []) {
		const key = String(row.category_name).trim().toLowerCase();
		categoryMap.set(key, { id: row.id });
	}

	const updatePromises = data.map(
		async (item: { category_name: string; url: string }) => {
			try {
				// 1. Resolve category by case-insensitive trimmed name
				const key = item.category_name.trim().toLowerCase();
				const category = categoryMap.get(key);
				if (!category) {
					console.warn(`Category '${item.category_name}' not found`);
					return {
						url: item.url,
						success: false,
						reason: "Category not found",
					};
				}

				const categoryId = category.id;

				// 2. Get the bookmark ID for this URL
				const { data: bookmarkData, error: bookmarkError } = await supabase
					.from(MAIN_TABLE_NAME)
					.select("id")
					.eq("url", item.url)
					.eq("type", tweetType)
					.eq("user_id", userId)
					.single();

				if (bookmarkError || !bookmarkData) {
					console.error(
						`Failed to find bookmark for ${item.url}`,
						bookmarkError,
					);
					return {
						url: item.url,
						success: false,
						reason: "Bookmark not found",
					};
				}

				// 3. Upsert into junction table
				const { error: upsertError } = await supabase
					.from(BOOKMARK_CATEGORIES_TABLE_NAME)
					.upsert(
						{
							bookmark_id: bookmarkData.id,
							category_id: categoryId,
							user_id: userId,
						},
						{ onConflict: "bookmark_id,category_id", ignoreDuplicates: true },
					);

				if (upsertError) {
					console.error(
						`Failed to upsert category for ${item.url}`,
						upsertError,
					);
					return { url: item.url, success: false };
				}

				return { url: item.url, success: true };
			} catch (error) {
				console.error("Unexpected error:", error);
				Sentry.captureException(error);
				return { url: item.url, success: false };
			}
		},
	);

	// Run all updates in parallel, don’t stop on error
	const results = await Promise.allSettled(updatePromises);

	response.status(200).json({ data: results, error: null });
}
