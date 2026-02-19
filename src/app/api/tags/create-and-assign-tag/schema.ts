import { z } from "zod";

import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";

export const CreateAndAssignTagPayloadSchema = z.object({
	name: tagCategoryNameSchema.meta({
		description: "Tag name to create (1–20 characters)",
	}),
	bookmarkId: z
		.number()
		.meta({ description: "ID of the bookmark to assign the new tag to" }),
});

export type CreateAndAssignTagPayload = z.infer<
	typeof CreateAndAssignTagPayloadSchema
>;

const TagSchema = z.object({
	id: z.number().meta({ description: "Newly created tag ID" }),
	name: z.string().nullable().meta({ description: "Tag name" }),
	user_id: z.string().nullable().meta({ description: "Owner user ID" }),
	created_at: z
		.string()
		.nullable()
		.meta({ description: "ISO timestamp when tag was created" }),
});

const BookmarkTagSchema = z.object({
	id: z.number().meta({ description: "Bookmark-tag junction record ID" }),
	bookmark_id: z.number().meta({ description: "Associated bookmark ID" }),
	tag_id: z.number().meta({ description: "Associated tag ID" }),
	user_id: z.string().nullable().meta({ description: "Owner user ID" }),
	created_at: z
		.string()
		.nullable()
		.meta({ description: "ISO timestamp when assignment was created" }),
});

export const CreateAndAssignTagResponseSchema = z.object({
	tag: TagSchema.meta({ description: "The newly created tag" }),
	bookmarkTag: BookmarkTagSchema.meta({
		description: "The tag-to-bookmark assignment record",
	}),
});

export type CreateAndAssignTagResponse = z.infer<
	typeof CreateAndAssignTagResponseSchema
>;
