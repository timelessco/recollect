import { z } from "zod";

import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { createApiClient } from "@/lib/supabase/api";
import { MAIN_TABLE_NAME } from "@/utils/constants";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "fetch-discoverable-by-id";

const FetchDiscoverableByIdQuerySchema = z.object({
	id: z.coerce.number().int().positive(),
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

const DiscoverableBookmarkSchema = z.object({
	id: z.number(),
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

const FetchDiscoverableByIdResponseSchema = DiscoverableBookmarkSchema;

export const GET = createGetApiHandler({
	inputSchema: FetchDiscoverableByIdQuerySchema,
	outputSchema: FetchDiscoverableByIdResponseSchema,
	route: ROUTE,
	handler: async ({ input, route }) => {
		const { id } = input;

		console.log(`[${route}] API called:`, { id });

		const { supabase } = await createApiClient();

		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.select(
				`
				id,
				inserted_at,
				title,
				url,
				description,
				ogImage,
				screenshot,
				category_id,
				trash,
				type,
				meta_data,
				sort_index,
				make_discoverable
			`,
			)
			.eq("id", id)
			.eq("trash", false)
			.not("make_discoverable", "is", null)
			.maybeSingle();

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch discoverable bookmark",
				error,
				operation: "fetch_discoverable_bookmark_by_id",
				extra: { id },
			});
		}

		if (!data) {
			return apiWarn({
				route,
				message: "Bookmark not found or not discoverable",
				status: HttpStatus.NOT_FOUND,
				context: { id },
			});
		}

		console.log(`[${route}] Discoverable bookmark fetched successfully:`, {
			bookmarkId: data.id,
		});

		return data;
	},
});
