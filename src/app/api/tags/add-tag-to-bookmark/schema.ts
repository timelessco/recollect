import { z } from "zod";

export const AddTagToBookmarkPayloadSchema = z.object({
	bookmarkId: z.number(),
	tagId: z.number(),
});

export type AddTagToBookmarkPayload = z.infer<
	typeof AddTagToBookmarkPayloadSchema
>;

export const AddTagToBookmarkResponseSchema = z
	.array(
		z.object({
			id: z.number(),
			bookmark_id: z.number(),
			tag_id: z.number(),
			user_id: z.string().nullable(),
			created_at: z.string().nullable(),
		}),
	)
	.nonempty();

export type AddTagToBookmarkResponse = [
	z.infer<typeof AddTagToBookmarkResponseSchema>[number],
	...z.infer<typeof AddTagToBookmarkResponseSchema>,
];
