import { z } from "zod";

export const FetchUserProfileInputSchema = z.object({
	avatar: z
		.string()
		.optional()
		.meta({ description: "OAuth avatar URL to sync as profile picture" }),
});

export const FetchUserProfileOutputSchema = z.array(
	z.object({
		ai_features_toggle: z.unknown(),
		api_key: z.string().nullable(),
		bookmark_count: z.number().nullable(),
		bookmarks_view: z.unknown().nullable(),
		category_order: z.array(z.number()).nullable(),
		display_name: z.string().nullable(),
		email: z.string().nullable(),
		id: z.string(),
		preferred_og_domains: z.array(z.string()).nullable(),
		profile_pic: z.string().nullable(),
		provider: z.string().nullable(),
		user_name: z.string().nullable(),
	}),
);
