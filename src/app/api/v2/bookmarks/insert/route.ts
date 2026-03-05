// Called by: Chrome extension (recollect-chrome-extension) for bulk bookmark import
import {
	BookmarksInsertInputSchema,
	BookmarksInsertOutputSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { MAIN_TABLE_NAME } from "@/utils/constants";

const ROUTE = "v2-bookmarks-insert";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: BookmarksInsertInputSchema,
	outputSchema: BookmarksInsertOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] API called:`, {
			userId,
			bookmarkCount: data.data.length,
		});

		const insertData = data.data.map((item) => ({
			...item,
			user_id: userId,
		}));

		const { data: inserted, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.insert(insertData)
			.select("id");

		if (error) {
			return apiError({
				route,
				message: "Failed to insert bookmarks",
				error,
				operation: "insert_bookmarks",
				userId,
				extra: { bookmarkCount: data.data.length },
			});
		}

		return { insertedCount: inserted.length };
	},
});
