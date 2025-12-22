import { z } from "zod";

import {
	MAX_TAG_COLLECTION_NAME_LENGTH,
	MIN_TAG_COLLECTION_NAME_LENGTH,
} from "@/utils/constants";

/**
 * Shared validation schema for tag and category names.
 * Used by both client (edit-popover) and server (API routes).
 *
 * Features:
 * - Auto-trims whitespace via `.trim()`
 * - Validates minimum length (prevents empty strings)
 * - Validates maximum length
 * - Provides clear error messages
 */
export const tagCategoryNameSchema = z
	.string({ error: "Name is required" })
	.trim()
	.min(
		MIN_TAG_COLLECTION_NAME_LENGTH,
		`Name must be at least ${MIN_TAG_COLLECTION_NAME_LENGTH} character${MIN_TAG_COLLECTION_NAME_LENGTH === 1 ? "" : "s"}`,
	)
	.max(
		MAX_TAG_COLLECTION_NAME_LENGTH,
		`Name must be at most ${MAX_TAG_COLLECTION_NAME_LENGTH} characters`,
	);

/**
 * Type inference for validated tag/category names.
 * This is the output type after Zod validation (already trimmed).
 */
export type TagCategoryName = z.output<typeof tagCategoryNameSchema>;
