import { GoogleGenerativeAI } from "@google/generative-ai";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";

import type { AiToggles } from "@/utils/ai-feature-toggles";
import type { BookmarkContentType } from "@/utils/resolve-content-type";
import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/env/server";
import { GEMINI_MODEL } from "@/utils/constants";

import { getApikeyAndBookmarkCount, incrementBookmarkCount } from "./api-key";

export interface UserCollection {
  id: number;
  name: string;
}

export interface ImageToTextContextProps {
  collections: UserCollection[];
  description?: null | string;
  title?: null | string;
  url?: null | string;
}

export interface StructuredKeywords {
  color?: string[];
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

export interface ImageToTextOptions {
  contentType?: BookmarkContentType;
  isOgImage?: boolean;
}

function formatMetadataContext(context?: ImageToTextContextProps | null): string {
  const lines: string[] = [];
  if (context?.title) {
    lines.push(`Title: ${context.title}`);
  }

  if (context?.url) {
    lines.push(`URL: ${context.url}`);
  }

  if (context?.description) {
    lines.push(`Description: ${context.description}`);
  }

  return lines.length > 0
    ? [
        "",
        "Bookmark metadata (use as context only — do not repeat or paraphrase the description in your summary):",
        ...lines,
      ].join("\n")
    : "";
}

/**
 * Generates the image description using Gemini AI.
 * Prompt sections are dynamically included based on active AI toggles.
 * Returns null without calling Gemini when all toggles are off.
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

    // Skip API call entirely when all toggles are off
    const activeToggles = toggles ?? {
      aiSummary: true,
      autoAssignCollections: true,
      imageKeywords: true,
      ocr: true,
    };
    const hasAnyPromptToggle =
      activeToggles.aiSummary || activeToggles.imageKeywords || activeToggles.ocr;
    const hasCollectionsToggle =
      activeToggles.autoAssignCollections && (context?.collections ?? []).length > 0;

    if (!hasAnyPromptToggle && !hasCollectionsToggle) {
      return {
        image_keywords: {},
        matched_collection_ids: [],
        ocr_text: null,
        sentence: null,
      };
    }

    // Audio files use a static SVG waveform — skip AI enrichment entirely
    if (options?.contentType === "audio") {
      return {
        image_keywords: {},
        matched_collection_ids: [],
        ocr_text: null,
        sentence: null,
      };
    }

    // Fetch the image
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBytes = Buffer.from(imageResponse.data).toString("base64");

    // Initialize the model
    const key = userApiKey ?? env.GOOGLE_GEMINI_TOKEN;

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
    });

    // Build prompt sections dynamically based on active toggles
    const contentType = options?.contentType ?? "link";
    const promptParts: string[] = ["Analyze this image and provide the following parts."];
    const formatLines: string[] = [];

    // SENTENCE section (controlled by aiSummary toggle)
    if (activeToggles.aiSummary) {
      const metadataBlock = formatMetadataContext(context);

      // Shared constraint — prevents Gemini from describing the image wrapper
      // instead of the actual content being bookmarked.
      const noImageMeta =
        'Never reference the image itself — no "thumbnail", "screenshot", "OG image", "preview", "the image shows", or "this is a picture of".';

      const humanTone =
        "Write as if telling a friend what this bookmark is about. Be direct — no filler, no introductory phrases. Start with the key info. Do NOT describe colors, UI elements, or visual style — keywords handle that.";

      let sentenceInstruction: string;

      switch (contentType) {
        case "document": {
          sentenceInstruction = [
            "Summarize this document. Name the platform if recognizable from the URL.",
            "Cover: subject, document type (report, manual, paper, etc.), key topic.",
            humanTone,
            noImageMeta,
            metadataBlock,
          ].join("\n");
          break;
        }

        case "image": {
          sentenceInstruction = [
            "Describe what you see: who or what is in the image, where it is, and the context.",
            humanTone,
          ].join("\n");
          break;
        }

        case "instagram": {
          sentenceInstruction = [
            "Summarize this Instagram post — what it's about and its topic.",
            humanTone,
            noImageMeta,
            metadataBlock,
          ].join("\n");
          break;
        }

        case "link": {
          const isOgImage = options?.isOgImage ?? true;

          sentenceInstruction = isOgImage
            ? [
                "Summarize this webpage. Name the website/platform from the URL.",
                "Cover: what the page is about, main topic, key details.",
                humanTone,
                noImageMeta,
                metadataBlock,
              ].join("\n")
            : [
                "Summarize this webpage from its screenshot. Name the website/platform from the URL.",
                "Classify and focus accordingly:",
                humanTone,
                noImageMeta,
                metadataBlock,
              ].join("\n");
          break;
        }

        case "tweet": {
          sentenceInstruction = [
            "Summarize this Twitter/X post — topic and main point.",
            humanTone,
            noImageMeta,
            metadataBlock,
          ].join("\n");
          break;
        }

        case "video": {
          sentenceInstruction = [
            "Summarize this video. Name the platform from the URL.",
            "Cover: topic, format (tutorial, review, vlog, etc.), key subject.",
            humanTone,
            noImageMeta,
            metadataBlock,
          ].join("\n");
          break;
        }

        default: {
          sentenceInstruction = [
            "Describe what you see: who or what is in the image, where it is, and the context.",
            humanTone,
          ].join("\n");
        }
      }

      promptParts.push(
        "",
        "SENTENCE:",
        sentenceInstruction,
        "Name recognizable people (celebrities, actors, characters, politicians). Otherwise use man, woman, person.",
      );
      formatLines.push("SENTENCE: <your sentence here>");
    }

    // KEYWORDS section (controlled by imageKeywords toggle)
    if (activeToggles.imageKeywords) {
      const keywordsInstruction = [
        "Return a nested JSON object with these top-level keys (all arrays of strings):",
        "",
        '- "type": 1–3 content types from the CLOSED list below. Pick the MOST SPECIFIC match first.',
        '  Allowed values (use EXACTLY — do not invent or combine): "article", "blog", "documentation", "infographic", "meme", "newsletter", "recipe", "tutorial", "image", "photo", "poster",  "video", "music_album", "podcast", "movie", "tvshow", "anime", "game", "xpost", "instapost", "redditpost", "pin", "thread", "product", "deal", "review", "repo", "portfolio", "webapp", "ecommerce", "streaming", "news", "design", "developer tools", "productivity", "social media", "course", "book", "research_paper", "job", "event", "place", "restaurant", "pdf", "profile", "package", "linkedinpost", "tiktok"',
        "",
        '- "people": ONLY named/identifiable people — use their actual name from text, metadata, or URL. Include directors, cast, authors. Do NOT output generic labels like man/woman/person — omit entirely if unknown.',
        '- "object": physical objects visible in the image.',
        '- "place": locations, settings, landmarks.',
        '- "color": dominant colors as hex codes (e.g. "#FF5733", "#1A1A1A").',
        "",
        '- "features": a flat object (NOT an array) for searchable metadata about the content. Include any key-value pair that helps identify or find the bookmark later. Common examples by domain:',
        "  Universal: brand (the company/studio, NOT the hosting platform and NOT the content title — e.g. brand is 'Madhouse' not 'One Punch Man'), title (show/movie/book/series name), author, source, rating, duration, reading_time.",
        "  Product: model, price (no thousand separators e.g. ₹8295), capacity, material, size.",
        "  Entertainment: director, cast, genre, release_year, runtime, platform.",
        "  Recipe: cuisine, cook_time, servings, difficulty, diet.",
        "  Dev: programming_language, framework, license.",
        "  Job: company, salary_range, experience_level, remote.",
        "  Add any other relevant metadata you discover — these are examples, not limits.",
        '  "additional_keywords": an array of 3–8 topic tags that describe what this content is about (e.g. ["fintech", "crypto wallet", "stablecoin", "payments"]). Think: what would someone search to find this bookmark later?',
        "",
        "Rules:",
        "- Only include type values if you are ≥85% confident. All other keys: ≥70% confident. Do NOT output confidence scores.",
        "- Top-level keys (type, people, object, place, color) are arrays of strings.",
        '- "features" is a flat object of string key-value pairs, except "additional_keywords" which is an array of strings.',
        "- Omit empty arrays and empty objects — do not include keys with [] or {}.",
        "- Output valid JSON only, no markdown fences.",
        "- No duplicate values across any arrays or features. Each keyword/value should appear only once in the entire JSON.",
        "- Do NOT duplicate OCR body text as keywords. Product identifiers (model numbers, SKUs) and names ARE keywords.",
      ].join("\n");

      promptParts.push("", "KEYWORDS:", keywordsInstruction);
      formatLines.push(
        'KEYWORDS: {"type": ["..."], "people": ["..."], "object": ["..."], "place": ["..."], "color": ["..."], "features": {"brand": "...", ...}}',
      );
    }

    // OCR section (controlled by ocr toggle)
    if (activeToggles.ocr) {
      promptParts.push(
        "",
        "OCR_TEXT:",
        "Extract all visible, readable text from this image exactly as it appears.",
        "If no text is visible, write NONE.",
        "Do NOT paraphrase or summarize — copy the text verbatim.",
      );
      formatLines.push("OCR_TEXT: <extracted text, or NONE>");
    }

    // COLLECTIONS section (controlled by autoAssignCollections toggle + having collections)
    const collections = context?.collections ?? [];
    const includeCollections = activeToggles.autoAssignCollections && collections.length > 0;

    if (includeCollections) {
      promptParts.push(
        "",
        "COLLECTIONS:",
        "Given the image AND the additional bookmark context below, determine which of the user's existing collections this bookmark belongs to.",
        "Return up to 3 best matches with a confidence percentage (0-100%). If nothing fits, return NONE.",
        "Rules:",
        "- ONLY use collection names from the exact list below — never invent names",
        "- Be strict — a vague or tangential connection should get a LOW score (below 50%)",
        "- Only give 90%+ when the bookmark's primary topic is a direct, obvious match for the collection",
        "- When nothing fits well, return NONE",
        "",
        "User's collections:",
        collections.map((collection) => `- ${collection.name}`).join("\n"),
        "",
        "Additional bookmark context:",
        ...(context?.title ? [`Title: ${context.title}`] : []),
        ...(context?.url ? [`URL: ${context.url}`] : []),
        ...(context?.description ? [`Description: ${context.description}`] : []),
      );
      formatLines.push("COLLECTIONS: <name> (<confidence>%) per line, or NONE");
    }

    // Skip API call if no prompt sections were added (e.g., only autoAssignCollections on with no collections)
    if (formatLines.length === 0) {
      return {
        image_keywords: {},
        matched_collection_ids: [],
        ocr_text: null,
        sentence: null,
      };
    }

    // Add response format instructions
    promptParts.push("", "Respond in exactly this format:", ...formatLines);

    const captionPrompt = promptParts.join("\n");
    const captionResult = await model.generateContent([
      captionPrompt,
      {
        inlineData: {
          data: imageBytes,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const rawText = captionResult.response.text();
    if (!rawText?.trim()) {
      return null;
    }

    // Normalize marker variants Gemini may produce
    const text = rawText.replaceAll(/OCR[ _]TEXT:/gu, "OCR_TEXT:");

    // Parse response — only extract sections that were requested
    let sentence: null | string = null;
    if (activeToggles.aiSummary) {
      const sentencePart = text
        .split("KEYWORDS:")[0]
        ?.split("OCR_TEXT:")[0]
        ?.split("COLLECTIONS:")[0];
      const sentenceMatch = /SENTENCE:\s*(.+)/su.exec(sentencePart ?? "");
      const rawSentence = sentenceMatch?.[1]?.trim() ?? null;
      // Strip brackets Gemini may copy from format template
      sentence = rawSentence?.replace(/^\[(.+)\]$/su, "$1")?.trim() ?? null;
    }

    const image_keywords: StructuredKeywords = {};
    if (activeToggles.imageKeywords && text.includes("KEYWORDS:")) {
      const [, keywordsPart] = text.split("KEYWORDS:");
      const keywordsBeforeNext = keywordsPart?.split("OCR_TEXT:")[0]?.split("COLLECTIONS:")[0];
      const rawKeywords = keywordsBeforeNext?.trim() ?? "";

      // Strip markdown fences Gemini may wrap around JSON
      const unfenced = rawKeywords.replaceAll(/```(?:json)?\n?([\s\S]*?)```/gu, "$1").trim();

      // Extract the first JSON object block
      const jsonMatch = /\{[\s\S]*\}/u.exec(unfenced);
      if (jsonMatch) {
        try {
          const parsed: unknown = JSON.parse(jsonMatch[0]);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const obj = parsed as Record<string, unknown>;
            const ARRAY_KEYS = new Set(["color", "object", "people", "place", "type"]);

            for (const arrayKey of ARRAY_KEYS) {
              const value = obj[arrayKey];
              if (Array.isArray(value)) {
                const filtered = value.filter(
                  (item): item is string => typeof item === "string" && item.trim().length > 0,
                );
                if (filtered.length > 0) {
                  image_keywords[arrayKey as keyof Omit<StructuredKeywords, "features">] = filtered;
                }
              }
            }

            if (obj.features && typeof obj.features === "object" && !Array.isArray(obj.features)) {
              const features: Record<string, string | string[]> = {};
              for (const [k, v] of Object.entries(obj.features as Record<string, unknown>)) {
                if (typeof v === "string" && v.trim()) {
                  features[k] = v.trim();
                } else if (k === "additional_keywords" && Array.isArray(v)) {
                  const filtered = v.filter(
                    (item): item is string => typeof item === "string" && item.trim().length > 0,
                  );
                  if (filtered.length > 0) {
                    features[k] = filtered;
                  }
                }
              }
              if (Object.keys(features).length > 0) {
                image_keywords.features = features;
              }
            }
          }
        } catch {
          Sentry.captureMessage("Failed to parse structured keywords JSON from Gemini", {
            extra: { imageUrl, rawJson: jsonMatch[0].slice(0, 500) },
            level: "warning",
            tags: { operation: "structured_keywords_parse" },
          });
        }
      } else if (unfenced.length > 0) {
        Sentry.addBreadcrumb({
          category: "ai.keywords",
          data: { rawKeywords: unfenced.slice(0, 200) },
          level: "warning",
          message: "Gemini returned keywords without valid JSON object",
        });
      }
    }

    let ocr_text: null | string = null;
    if (activeToggles.ocr && text.includes("OCR_TEXT:")) {
      const rawOcr = text.split("OCR_TEXT:")[1]?.split("COLLECTIONS:")[0]?.trim();
      // Strip brackets Gemini may copy from format template
      const ocrPart = rawOcr?.replace(/^\[(.+)\]$/su, "$1")?.trim();
      ocr_text = ocrPart && !/^none$/iu.test(ocrPart) ? ocrPart : null;
    }

    // Parse collections — each line is "CollectionName (XX%)", filter >= 90%
    const CONFIDENCE_THRESHOLD = 90;
    const matched_collection_ids: number[] = [];
    if (includeCollections && text.includes("COLLECTIONS:")) {
      const collectionsPart = text.split("COLLECTIONS:")[1]?.trim() ?? "";

      if (!/^none$/iu.test(collectionsPart.split("\n")[0]?.trim() ?? "")) {
        const collectionNameToId = new Map(
          collections.map((collection) => [collection.name.toLowerCase(), collection.id]),
        );

        // Extract all "Name (XX%)" entries — handles both comma-separated and multi-line
        const entryPattern = /([^,(]+)\((\d+)%?\)/gu;
        let entryMatch;

        while ((entryMatch = entryPattern.exec(collectionsPart)) !== null) {
          const name = entryMatch[1]?.trim() ?? "";
          const confidence = Number(entryMatch[2]);
          const collectionId = collectionNameToId.get(name.toLowerCase());

          if (collectionId !== undefined && confidence >= CONFIDENCE_THRESHOLD) {
            matched_collection_ids.push(collectionId);
          }
        }
      }
    }

    if (!sentence && text.trim() && activeToggles.aiSummary) {
      sentence = text
        .trim()
        .replace(/^\[(.+)\]$/su, "$1")
        .trim();
    }

    if (!userApiKey && (ocr_text || sentence)) {
      await incrementBookmarkCount(supabase, userId);
    }

    return { image_keywords, matched_collection_ids, ocr_text, sentence };
  } catch (error) {
    console.error("Image caption error", error);
    throw error;
  }
};

export default imageToText;
