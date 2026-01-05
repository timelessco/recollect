import { z } from "zod";

import { createSupabaseGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createApiClient } from "@/lib/supabase/api";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "@/utils/constants";

const ROUTE = "fetch-discoverable-bookmarks";

const FetchDiscoverBookmarksQuerySchema = z.object({
	page: z.coerce.number().int().nonnegative(),
});

const MetadataSchema = z.object({
	coverImage: z.string().nullable().optional(),
	favIcon: z.string().nullable().optional(),
	height: z.number().nullable().optional(),
	iframeAllowed: z.boolean().nullable().optional(),
	img_caption: z.string().nullable().optional(),
	isOgImagePreferred: z.boolean().optional(),
	isPageScreenshot: z.boolean().nullable().optional(),
	mediaType: z.string().nullable().optional(),
	ocr: z.string().nullable().optional(),
	ogImgBlurUrl: z.string().nullable().optional(),
	screenshot: z.string().nullable().optional(),
	twitter_avatar_url: z.string().nullable().optional(),
	video_url: z.string().nullable().optional(),
	width: z.number().nullable().optional(),
});

const DiscoverableBookmarkRowSchema = z.object({
	id: z.number(),
	user_id: z.string(),
	inserted_at: z.string(),
	title: z.string().nullable(),
	url: z.string().nullable(),
	description: z.string().nullable(),
	ogImage: z.string().nullable(),
	screenshot: z.string().nullable(),
	category_id: z.number(),
	trash: z.boolean(),
	type: z.string().nullable(),
	meta_data: MetadataSchema.nullable(),
	sort_index: z.string().nullable(),
	make_discoverable: z.string().nullable(),
});

const FetchDiscoverBookmarksResponseSchema = z
	.array(DiscoverableBookmarkRowSchema)
	.nullable();

const getRange = (page: number) => {
	const rangeStart = page * PAGINATION_LIMIT;
	const rangeEnd = (page + 1) * PAGINATION_LIMIT - 1;

	return { rangeEnd, rangeStart };
};

export const GET = createSupabaseGetApiHandler({
	inputSchema: FetchDiscoverBookmarksQuerySchema,
	outputSchema: FetchDiscoverBookmarksResponseSchema,
	route: ROUTE,
	handler: async ({ input, route }) => {
		const { page } = input;
		const { rangeEnd, rangeStart } = getRange(page);

		console.log(`[${route}] API called:`, {
			page,
			rangeStart,
			rangeEnd,
		});

		const { supabase } = await createApiClient();

		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("*")
			.eq("trash", false)
			.not("make_discoverable", "is", null)
			.order("make_discoverable", { ascending: false })
			.range(rangeStart, rangeEnd);

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch discoverable bookmarks",
				error,
				operation: "fetch_discoverable_bookmarks",
				extra: {
					page,
					rangeStart,
					rangeEnd,
				},
			});
		}

		console.log(`[${route}] Discoverable bookmarks fetched successfully:`, {
			count: data?.length ?? 0,
		});

		return data;
	},
});
