import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { isEmpty } from "lodash";
import { z } from "zod";

import {
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
} from "../../../../utils/constants";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

// Zod schema for request body validation
const requestSchema = z.object({
	data: z.array(
		z.object({
			category_name: z.string().min(1, "Category name is required"),
			url: z.string().url("Invalid URL format"),
		}),
	),
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

	const updatePromises = data.map(
		async (item: { category_name: string; url: string }) => {
			try {
				// 1. Fetch category id
				const { data: categoryData, error: categoryError } = await supabase
					.from(CATEGORIES_TABLE_NAME)
					.select("id")
					.eq("category_name", item.category_name)
					.eq("icon", "bookmark")
					.eq("user_id", userId)
					.single();

				if (!categoryData) {
					console.warn(`Category '${item.category_name}' not found`);
					return {
						url: item.url,
						success: false,
						reason: "Category not found",
					};
				}

				if (categoryError) {
					console.error(`Failed to fetch category id`, categoryError);
					return { url: item.url, success: false };
				}

				const categoryId = categoryData.id;

				// 2. Update main table
				const { error: updateError } = await supabase
					.from(MAIN_TABLE_NAME)
					.update({ category_id: categoryId })
					.eq("url", item.url)
					.eq("user_id", userId);

				if (updateError) {
					console.error(`Failed to update ${item.url}`, updateError);
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
