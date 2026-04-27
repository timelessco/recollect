import { GoogleGenAI } from "@google/genai";
import * as Sentry from "@sentry/nextjs";
import { converter } from "culori";

import type {
  GeminiResponse,
  ImageToTextContextProps,
  ImageToTextOptions,
  ImageToTextResult,
  OklabColor,
  StructuredKeywords,
} from "./schemas/image-analysis-schema";
import type { AiToggles } from "@/utils/ai-feature-toggles";
import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/env/server";
import { GEMINI_MODEL } from "@/utils/constants";
import { assertSafeImageUrl } from "@/utils/safe-fetch";

import { getApikeyAndBookmarkCount, incrementBookmarkCount } from "./api-key";
import { buildResponseSchema, fullResponseSchema } from "./schemas/image-analysis-schema";
import { SYSTEM_INSTRUCTION, buildPrompt } from "./schemas/prompt-builder";

const CONFIDENCE_THRESHOLD = 90;

const EMPTY_RESULT: ImageToTextResult = {
  image_keywords: {},
  matched_collection_ids: [],
  ocr_text: null,
  sentence: null,
};

/**
 * Generates the image description using Gemini AI with structured output.
 * The response schema is built dynamically based on active AI toggles.
 * Returns null without calling Gemini when all toggles are off or limits are reached.
 */
export const imageToText = async (
  imageUrl: string,
  supabase: SupabaseClient,
  userId: string,
  options?: ImageToTextOptions | null,
  context?: ImageToTextContextProps | null,
  toggles?: AiToggles | null,
): Promise<ImageToTextResult | null> => {
  try {
    const { isLimitReached, userApiKey } = await getApikeyAndBookmarkCount(supabase, userId);

    if (!userApiKey && isLimitReached) {
      console.warn("Monthly free limit reached — skipping caption generation.");
      return null;
    }

    const activeToggles = toggles ?? {
      aiSummary: true,
      autoAssignCollections: true,
      imageKeywords: true,
      ocr: true,
    };

    // Audio files use a static SVG waveform — skip AI enrichment entirely
    if (options?.contentType === "audio") {
      return EMPTY_RESULT;
    }

    // Build schema and prompt based on active toggles
    const collections = context?.collections ?? [];
    const responseSchema = buildResponseSchema(activeToggles, collections.length > 0);

    if (!responseSchema) {
      return EMPTY_RESULT;
    }

    const prompt = buildPrompt({
      collections,
      contentType: options?.contentType ?? "link",
      context,
      isOgImage: options?.isOgImage,
      toggles: activeToggles,
    });

    if (!prompt) {
      return EMPTY_RESULT;
    }

    // SSRF guard: reject non-https / RFC1918 / loopback / link-local / metadata
    // before forwarding bytes to Gemini. See src/utils/safe-fetch.ts.
    await assertSafeImageUrl(imageUrl);

    // Fetch the image
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error(`Image fetch failed: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    const imageBuffer = await imageResponse.arrayBuffer();

    // Second line of defense against an empty upstream payload — R2 happily returns
    // `200 OK` with `content-length: 0` for blobs that were written empty. Sending
    // that to Gemini produces a misleading `INVALID_ARGUMENT` instead of the true
    // root cause (upstream capture stored 0 bytes). Throwing here makes the failure
    // legible and keeps the archive + replay pipeline intact.
    if (imageBuffer.byteLength === 0) {
      throw new Error(`Empty image body from ${imageUrl}`);
    }

    const imageBytes = Buffer.from(imageBuffer).toString("base64");

    // Call Gemini with structured output
    const key = userApiKey ?? env.GOOGLE_GEMINI_TOKEN;
    const ai = new GoogleGenAI({ apiKey: key });

    const response = await ai.models.generateContent({
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: responseSchema,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      contents: [
        prompt,
        {
          inlineData: {
            data: imageBytes,
            mimeType: contentType,
          },
        },
      ],
      model: GEMINI_MODEL,
    });

    // Guard against empty/safety-blocked responses
    if (!response.text) {
      Sentry.captureMessage("Gemini returned empty response with structured output", {
        level: "warning",
        tags: { operation: "structured_output_empty" },
      });
      return null;
    }

    let rawParsed: unknown;

    try {
      rawParsed = JSON.parse(response.text);
    } catch {
      Sentry.captureMessage("Gemini returned invalid JSON despite structured output mode", {
        extra: { rawText: response.text.slice(0, 500) },
        level: "warning",
        tags: { operation: "structured_output_json_parse" },
      });
      return null;
    }

    const parseResult = fullResponseSchema.safeParse(rawParsed);

    if (!parseResult.success) {
      Sentry.captureMessage("Gemini structured output failed Zod validation", {
        extra: {
          errors: parseResult.error.message.slice(0, 500),
          rawText: response.text.slice(0, 500),
        },
        level: "warning",
        tags: { operation: "structured_output_parse" },
      });
      return null;
    }

    const parsed = parseResult.data;

    // --- Map response to ImageToTextResult ---

    const sentence = activeToggles.aiSummary ? (parsed.sentence?.trim() ?? null) : null;

    const image_keywords = mapKeywords(parsed, activeToggles);

    const ocr_text = activeToggles.ocr ? (parsed.ocr_text?.trim() ?? null) : null;

    const matched_collection_ids = mapCollectionIds(parsed, collections);

    if (!userApiKey && (ocr_text || sentence)) {
      await incrementBookmarkCount(supabase, userId);
    }

    return { image_keywords, matched_collection_ids, ocr_text, sentence };
  } catch (error) {
    console.error("Image caption error", error);
    throw error;
  }
};

// Response mapping helpers

function mapKeywords(parsed: GeminiResponse, toggles: AiToggles): StructuredKeywords {
  if (!toggles.imageKeywords) {
    return {};
  }

  const keywords: StructuredKeywords = {};

  if (parsed.type?.length) {
    keywords.type = parsed.type;
  }
  if (parsed.people?.length) {
    keywords.people = parsed.people;
  }
  if (parsed.object?.length) {
    keywords.object = parsed.object;
  }
  if (parsed.place?.length) {
    keywords.place = parsed.place;
  }

  // Convert hex color codes to OKLAB (Gemini returns them sorted by dominance)
  if (parsed.colors?.length) {
    const toOklab = converter("oklab");
    const oklabColors = parsed.colors
      .map((hex) => {
        const oklab = toOklab(hex);
        if (!oklab) {
          return null;
        }
        return { a: oklab.a ?? 0, b: oklab.b ?? 0, l: oklab.l ?? 0 };
      })
      .filter((c): c is OklabColor => c !== null);

    if (oklabColors.length > 0) {
      keywords.colors = oklabColors;
    }
  }

  if (parsed.features && Object.keys(parsed.features).length > 0) {
    keywords.features = parsed.features;
  }

  return keywords;
}

function mapCollectionIds(
  parsed: GeminiResponse,
  collections: { id: number; name: string }[],
): number[] {
  if (!parsed.collections?.length || collections.length === 0) {
    return [];
  }

  const collectionNameToId = new Map(collections.map((c) => [c.name.toLowerCase(), c.id]));

  const matched: number[] = [];

  for (const { confidence, name } of parsed.collections) {
    const collectionId = collectionNameToId.get(name.toLowerCase());
    if (collectionId !== undefined && confidence >= CONFIDENCE_THRESHOLD) {
      matched.push(collectionId);
    }
  }

  return matched;
}
