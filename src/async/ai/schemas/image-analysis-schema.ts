import { z } from "zod";

import type { AiToggles } from "@/utils/ai-feature-toggles";
import type { BookmarkContentType } from "@/utils/resolve-content-type";

export interface UserCollection {
  id: number;
  name: string;
}

export interface OklabColor {
  a: number;
  b: number;
  l: number;
}

export interface StructuredKeywords {
  colors?: OklabColor[];
  features?: Record<string, string | string[]>;
  object?: string[];
  people?: string[];
  place?: string[];
  type?: string[];
}

export interface ImageToTextResult {
  image_keywords: StructuredKeywords;
  matched_collection_ids: number[];
  ocr_text: null | string;
  sentence: null | string;
}

export interface ImageToTextContextProps {
  collections: UserCollection[];
  description?: null | string;
  title?: null | string;
  url?: null | string;
}

export interface ImageToTextOptions {
  contentType?: BookmarkContentType;
  isOgImage?: boolean;
}

// Zod schema fragments for Gemini structured output

const sentenceResponseSchema = z.object({
  sentence: z.string().describe("Summary of the bookmark content"),
});

/**
 * Flat keywords schema — matches StructuredKeywords top-level keys directly.
 * `color` returns hex codes (converted to OKLAB post-response).
 * `features` uses z.record for arbitrary key-value metadata.
 */
const keywordsResponseSchema = z.object({
  colors: z
    .array(z.string())
    .min(1)
    .describe(
      "Hex color codes, ordered from most to least dominant in the image. Always extract at least one color.",
    ),
  features: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .optional()
    .describe(
      "Searchable metadata key-value pairs. additional_keywords is an array of topic tags.",
    ),
  object: z.array(z.string()).optional().describe("Physical objects visible in the image"),
  people: z
    .array(z.string())
    .optional()
    .describe("Named/identifiable people only — use actual names"),
  place: z.array(z.string()).optional().describe("Locations, settings, and landmarks"),
  type: z.array(z.string()).optional().describe("1-3 content types from the allowed list"),
});

const ocrResponseSchema = z.object({
  ocr_text: z
    .string()
    .nullable()
    .describe("Extracted text verbatim, or null if no text is visible"),
});

const collectionsResponseSchema = z.object({
  collections: z.array(
    z.object({
      confidence: z.number().min(0).max(100).describe("Match confidence percentage 0-100"),
      name: z.string().describe("Exact collection name from the provided list"),
    }),
  ),
});

/**
 * Full response schema (all toggles on). Used for Zod parsing of the
 * Gemini response in the orchestrator — all fields are optional so
 * partial responses (from dynamic schema) still parse successfully.
 *
 * `colors` overrides the stricter `keywordsResponseSchema` constraint
 * (`.min(1)`) so that a defiant Gemini response with `colors: []` does
 * not discard the entire enrichment payload at parse time.
 */
export const fullResponseSchema = z
  .object({
    ...sentenceResponseSchema.shape,
    ...keywordsResponseSchema.shape,
    colors: z.array(z.string()),
    ...ocrResponseSchema.shape,
    ...collectionsResponseSchema.shape,
  })
  .partial();

export type GeminiResponse = z.infer<typeof fullResponseSchema>;

// Dynamic schema builder

/**
 * Builds a JSON Schema for Gemini's `responseJsonSchema` based on active
 * AI toggles. Only includes sections the user has enabled.
 *
 * Returns `null` when no schema sections are active (caller should skip the
 * API call entirely).
 */
export function buildResponseSchema(
  toggles: AiToggles,
  hasCollections: boolean,
): Record<string, unknown> | null {
  let schema = z.object({});
  let hasFields = false;

  if (toggles.aiSummary) {
    schema = schema.extend(sentenceResponseSchema.shape);
    hasFields = true;
  }

  if (toggles.imageKeywords) {
    schema = schema.extend(keywordsResponseSchema.shape);
    hasFields = true;
  }

  if (toggles.ocr) {
    schema = schema.extend(ocrResponseSchema.shape);
    hasFields = true;
  }

  if (toggles.autoAssignCollections && hasCollections) {
    schema = schema.extend(collectionsResponseSchema.shape);
    hasFields = true;
  }

  if (!hasFields) {
    return null;
  }

  return schema.toJSONSchema() as Record<string, unknown>;
}
