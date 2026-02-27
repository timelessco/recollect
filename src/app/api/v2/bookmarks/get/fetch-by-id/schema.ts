import { z } from "zod";

export const FetchByIdInputSchema = z.object({
	id: z.coerce.number().int().meta({ description: "Bookmark ID" }),
});

const CategorySchema = z.object({
	category_name: z.string().nullable(),
	category_slug: z.string(),
	icon: z.string().nullable(),
	icon_color: z.string().nullable(),
	id: z.int(),
});

const BookmarkSchema = z.object({
	addedCategories: z.array(CategorySchema),
	category_id: z.int(),
	description: z.string().nullable(),
	id: z.int(),
	inserted_at: z.string(),
	make_discoverable: z.string().nullable(),
	meta_data: z.unknown(),
	ogImage: z.string().nullable(),
	screenshot: z.string().nullable(),
	sort_index: z.string().nullable(),
	title: z.string().nullable(),
	trash: z.string().nullable(),
	type: z.string().nullable(),
	url: z.string().nullable(),
	user_id: z.string(),
});

export const FetchByIdOutputSchema = z.array(BookmarkSchema);
