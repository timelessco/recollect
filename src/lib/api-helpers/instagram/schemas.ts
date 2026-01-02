import { z } from "zod";

export const InstagramSyncBookmarksPayloadSchema = z.object({
	data: z
		.array(
			z.object({
				description: z.string(),
				ogImage: z.string().nullable(),
				title: z.string(),
				type: z.string(),
				url: z.string(),
				meta_data: z.object({
					instagram_username: z.string(),
					instagram_profile_pic: z.string().nullable().optional(),
					favIcon: z.string(),
					video_url: z.string().nullable().optional(),
					saved_collection_names: z.array(z.string()).optional(),
				}),
				inserted_at: z.string().datetime().optional(),
				sort_index: z.string(),
				category_name: z.string().optional(),
			}),
		)
		.max(30),
});

export const InstagramSyncBookmarksResponseSchema = z.object({
	success: z.boolean(),
	error: z.string().nullable(),
	data: z
		.array(
			z.object({
				category_id: z.number(),
				description: z.string().nullable(),
				id: z.number(),
				inserted_at: z.string(),
				meta_data: z.unknown().nullable(),
				ogImage: z.string().nullable(),
				screenshot: z.string().nullable(),
				sort_index: z.string().nullable(),
				title: z.string().nullable(),
				trash: z.boolean(),
				type: z.string().nullable(),
				url: z.string().nullable(),
				user_id: z.string(),
			}),
		)
		.optional(),
});

export type InstagramMetaDataWithCollections = {
	instagram_username: string | null;
	instagram_profile_pic: string | null;
	favIcon: string | null;
	video_url: string | null;
	saved_collection_names?: string[];
} | null;

export type InstagramMetaData = {
	saved_collection_names?: string[];
} | null;

export type InstagramSyncBookmarksPayload = z.infer<
	typeof InstagramSyncBookmarksPayloadSchema
>;

export type InstagramSyncBookmarksResponse = z.infer<
	typeof InstagramSyncBookmarksResponseSchema
>;
