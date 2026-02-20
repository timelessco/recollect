/**
 * @module Build-time only
 *
 * Shared component schemas registered as named `$ref` entries in the spec.
 * Importing this file registers the schemas as a side effect.
 */
import { z } from "zod";

import { registry } from "@/lib/openapi/registry";

export const ArchiveItemSchema = registry.register(
	"ArchiveItem",
	z.object({
		msg_id: z.number().meta({ description: "Queue message ID" }),
		url: z.string().meta({ description: "Bookmarked URL" }),
		failure_reason: z
			.string()
			.nullable()
			.meta({ description: "Error message if import failed" }),
		archived_at: z
			.string()
			.nullable()
			.meta({ description: "ISO timestamp when successfully archived" }),
	}),
);

export const ImportStatusSchema = registry.register(
	"ImportStatus",
	z.object({
		pending: z
			.number()
			.meta({ description: "Number of imports waiting to be processed" }),
		archived: z
			.number()
			.meta({ description: "Number of successfully archived imports" }),
		archives: z
			.array(ArchiveItemSchema)
			.meta({ description: "Individual archive item records" }),
	}),
);

export const ImportRetryInputSchema = registry.register(
	"ImportRetryInput",
	z.union([
		z
			.object({
				msg_ids: z
					.array(z.number())
					.min(1)
					.max(100)
					.meta({ description: "Queue message IDs to retry" }),
			})
			.strict(),
		z
			.object({
				all: z
					.literal(true)
					.meta({ description: "Set to true to retry all failed imports" }),
			})
			.strict(),
	]),
);

export const ImportRetryOutputSchema = registry.register(
	"ImportRetryOutput",
	z.object({
		requeued: z
			.number()
			.meta({ description: "Number of messages requeued for retry" }),
		requested: z
			.number()
			.optional()
			.meta({ description: "Number of messages originally requested" }),
	}),
);

export const CategoryRowSchema = registry.register(
	"CategoryRow",
	z.object({
		id: z.number().meta({ description: "Category ID" }),
		category_name: z.string().nullable().meta({ description: "Display name" }),
		category_slug: z.string().meta({ description: "URL-safe slug" }),
		category_views: z
			.unknown()
			.nullable()
			.meta({ description: "JSONB view configuration" }),
		created_at: z
			.string()
			.nullable()
			.meta({ description: "ISO creation timestamp" }),
		icon: z.string().nullable().meta({ description: "Icon identifier" }),
		icon_color: z
			.string()
			.nullable()
			.meta({ description: "Icon color hex code" }),
		is_public: z
			.boolean()
			.meta({ description: "Whether collection is publicly visible" }),
		order_index: z
			.number()
			.nullable()
			.meta({ description: "Sort order position" }),
		user_id: z.string().nullable().meta({ description: "Owner user ID" }),
	}),
);
