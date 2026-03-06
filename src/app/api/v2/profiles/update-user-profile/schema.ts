import { z } from "zod";

const UpdateDataSchema = z
	.object({
		display_name: z.string().nullable().optional(),
		user_name: z.string().nullable().optional(),
		email: z.string().nullable().optional(),
		profile_pic: z.string().nullable().optional(),
		provider: z.string().nullable().optional(),
		preferred_og_domains: z.array(z.string()).nullable().optional(),
		category_order: z.array(z.int()).nullable().optional(),
		ai_features_toggle: z.unknown().optional(),
		bookmarks_view: z.unknown().optional(),
		bookmark_count: z.int().nullable().optional(),
	})
	.refine((obj) => Object.keys(obj).length > 0, {
		message: "At least one field required",
	});

export const UpdateUserProfileInputSchema = z.object({
	updateData: UpdateDataSchema,
});

export const UpdateUserProfileOutputSchema = z.array(
	z.object({
		ai_features_toggle: z.unknown(),
		api_key: z.string().nullable(),
		bookmark_count: z.int().nullable(),
		bookmarks_view: z.unknown().nullable(),
		category_order: z.array(z.int()).nullable(),
		display_name: z.string().nullable(),
		email: z.string().nullable(),
		id: z.string(),
		preferred_og_domains: z.array(z.string()).nullable(),
		profile_pic: z.string().nullable(),
		provider: z.string().nullable(),
		user_name: z.string().nullable(),
	}),
);
