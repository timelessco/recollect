import { z } from "zod";

import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
} from "@/utils/constants";
import { createServiceClient } from "@/utils/supabaseClient";

const ROUTE = "fetch-public-bookmark-by-id";

const FetchPublicBookmarkByIdQuerySchema = z.object({
	bookmark_id: z
		.string()
		.regex(/^\d+$/u, "Bookmark ID must be numeric")
		.transform(Number),
	user_name: z
		.string()
		.regex(/^[\w-]{1,39}$/u, "Invalid username format")
		.min(1)
		.max(39),
	category_slug: z
		.string()
		.regex(/^[\da-z-]+$/iu, "Invalid category slug format")
		.min(1)
		.max(100),
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

const ProfileSchema = z.object({
	user_name: z.string().nullable(),
});

const BookmarkSchema = z.object({
	id: z.number(),
	inserted_at: z.string(),
	title: z.string().nullable(),
	url: z.string().nullable(),
	description: z.string().nullable(),
	ogImage: z.string().nullable(),
	screenshot: z.string().nullable(),
	trash: z.string().nullable(),
	type: z.string().nullable(),
	meta_data: MetadataSchema.nullable(),
	make_discoverable: z.string().nullable(),
	user_id: ProfileSchema,
});

const FetchPublicBookmarkByIdResponseSchema = BookmarkSchema.nullable();

export type FetchPublicBookmarkByIdResponse = z.infer<
	typeof FetchPublicBookmarkByIdResponseSchema
>;

export const GET = createGetApiHandler({
	inputSchema: FetchPublicBookmarkByIdQuerySchema,
	outputSchema: FetchPublicBookmarkByIdResponseSchema,
	route: ROUTE,
	handler: async ({ input, route }) => {
		const {
			bookmark_id: bookmarkId,
			user_name: userName,
			category_slug: categorySlug,
		} = input;

		console.log(`[${route}] API called:`, {
			bookmarkId,
			userName,
			categorySlug,
		});

		const supabase = createServiceClient();

		const { data: categoryData, error: categoryError } = (await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select(
				`
				id,
				user_id (
					user_name
				),
				is_public
			`,
			)
			.eq("category_slug", categorySlug)
			.maybeSingle()) as {
			data: {
				id: number;
				is_public: boolean;
				user_id: {
					user_name: string | null;
				};
			} | null;
			error: unknown;
		};

		if (categoryError) {
			return apiError({
				route,
				message: "Failed to fetch category",
				error: categoryError,
				operation: "fetch_category",
				extra: { categorySlug },
			});
		}

		if (!categoryData) {
			console.log(`[${route}] Category not found:`, { categorySlug });
			return apiWarn({
				route,
				message: "Category not found",
				status: 404,
				context: { categorySlug },
			});
		}

		// Verify username matches
		if (categoryData.user_id?.user_name !== userName) {
			console.log(`[${route}] Username mismatch:`, {
				expected: categoryData.user_id?.user_name,
				provided: userName,
			});
			return apiWarn({
				route,
				message: "Username mismatch",
				status: 404,
				context: { userName, categorySlug },
			});
		}

		if (!categoryData.is_public) {
			console.log(`[${route}] Category is not public:`, { categorySlug });
			return apiWarn({
				route,
				message: "Category is not public",
				status: 403,
				context: { categorySlug },
			});
		}

		const categoryId = categoryData.id;

		console.log(`[${route}] Category verified:`, {
			categoryId,
			isPublic: categoryData.is_public,
		});

		const { data: bookmarkData, error: bookmarkError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select(
				`
				*,
				${BOOKMARK_CATEGORIES_TABLE_NAME}!inner (
					category_id
				),
				user_id!inner (
					user_name
				)
			`,
			)
			.eq("id", bookmarkId)
			.eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`, categoryId)
			.is("trash", null)
			.maybeSingle();

		if (bookmarkError) {
			return apiError({
				route,
				message: "Failed to fetch bookmark",
				error: bookmarkError,
				operation: "fetch_bookmark",
				extra: { bookmarkId, categoryId },
			});
		}

		if (!bookmarkData) {
			console.log(`[${route}] Bookmark not found in category:`, {
				bookmarkId,
				categoryId,
			});
			return apiWarn({
				route,
				message: "Bookmark not found in category",
				status: 404,
				context: { bookmarkId, categoryId },
			});
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { [BOOKMARK_CATEGORIES_TABLE_NAME]: _removed, ...cleanedBookmark } =
			bookmarkData;

		console.log(`[${route}] Bookmark fetched successfully:`, {
			bookmarkId: cleanedBookmark.id,
		});

		return cleanedBookmark;
	},
});
