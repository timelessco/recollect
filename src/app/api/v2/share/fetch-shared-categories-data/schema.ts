import { z } from "zod";

export const FetchSharedCategoriesDataInputSchema = z.object({});

export const FetchSharedCategoriesDataOutputSchema = z.array(
	z.object({
		category_id: z.int(),
		category_views: z.unknown(),
		created_at: z.string().nullable(),
		edit_access: z.boolean(),
		email: z.string().nullable(),
		id: z.int(),
		is_accept_pending: z.boolean().nullable(),
		user_id: z.string(),
	}),
);
