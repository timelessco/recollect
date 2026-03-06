import { z } from "zod";

export const RemoveTagFromBookmarkPayloadSchema = z.object({
	bookmarkId: z
		.number()
		.meta({ description: "ID of the bookmark to remove the tag from" }),
	tagId: z.number().meta({ description: "ID of the tag to remove" }),
});

export type RemoveTagFromBookmarkPayload = z.infer<
	typeof RemoveTagFromBookmarkPayloadSchema
>;

export const RemoveTagFromBookmarkResponseSchema = z
	.array(
		z.object({
			id: z.number().meta({ description: "Bookmark-tag junction record ID" }),
			bookmark_id: z.number().meta({ description: "Associated bookmark ID" }),
			tag_id: z.number().meta({ description: "Associated tag ID" }),
			user_id: z.string().nullable().meta({ description: "Owner user ID" }),
			created_at: z
				.string()
				.nullable()
				.meta({ description: "ISO timestamp when assignment was created" }),
		}),
	)
	.nonempty();

export type RemoveTagFromBookmarkResponse = [
	z.infer<typeof RemoveTagFromBookmarkResponseSchema>[number],
	...z.infer<typeof RemoveTagFromBookmarkResponseSchema>,
];
