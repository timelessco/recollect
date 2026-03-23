import { GoogleGenerativeAI } from "@google/generative-ai";
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

export interface ImageToTextResult {
  image_keywords: string[];
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

  if (context?.description) {
    lines.push(`Description: ${context.description}`);
  }

  if (context?.url) {
    lines.push(`URL: ${context.url}`);
  }

  return lines.length > 0 ? ["", "Bookmark metadata:", ...lines].join("\n") : "";
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
        image_keywords: [],
        matched_collection_ids: [],
        ocr_text: null,
        sentence: null,
      };
    }

    // Audio files use a static SVG waveform — skip AI enrichment entirely
    if (options?.contentType === "audio") {
      return {
        image_keywords: [],
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

    // For Image Caption: sentence + keywords. OCR handles text separately - do not include readable text.
    const siteCategories = [
      "- ARTICLE/DOCUMENTATION (blog, news, docs, Notion, wiki) → prefer when you see headings, sections, code blocks, or long-form content. Capture the actual intent: what is the content trying to teach, explain, or communicate? Include: page title, main topic, the core message or takeaway (e.g. 'how to style HTML in Tailwind', 'best practices for image attributes'), key concepts, color palette, style.",
      "- ECOMMERCE (product page, shop, listing) → explain what the product is (type, purpose, key features), brand, product name/model, colors, actual price (write without thousand separators, e.g. ₹8295 not ₹8,295), delivery options. State specific values when visible.",
      "- IMAGE/CONTENT (photo, artwork, product shot, person, place) → colors, people (name the person if recognizable: celebrity, actor, fictional character; otherwise man/woman/person), place/setting, objects, style, mood, composition type. Ignore minimal chrome.",
      "- NORMAL WEBSITE (landing, app, dashboard) → key text/headlines, colors, gist of what the site does, UI elements (nav, sidebar, forms, charts), site type or purpose.",
    ];

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

      let sentenceInstruction: string;

      switch (contentType) {
        case "document": {
          sentenceInstruction = [
            "You are summarizing a document. Identify the platform or source from the URL if recognizable (e.g. 'A Google Docs report on...', 'A Notion page about...', 'A PDF manual for...').",
            "Combine the metadata and the cover page/preview to write a rich, descriptive summary — the document's subject, type (research paper, report, manual, presentation, etc.), and key topic.",
            noImageMeta,
            metadataBlock,
          ].join("\n");
          break;
        }

        case "image": {
          sentenceInstruction =
            "Describe what you see. Focus on: colors, people (name the person if recognizable: celebrity, actor, fictional character; otherwise man/woman/person), place, objects.";
          break;
        }

        case "instagram": {
          sentenceInstruction = [
            "You are summarizing an Instagram post. The image is the post's visual content — use it together with the metadata below.",
            "Describe what the post is about and its topic.",
            noImageMeta,
            metadataBlock,
          ].join("\n");
          break;
        }

        case "link": {
          const isOgImage = options?.isOgImage ?? true;

          sentenceInstruction = isOgImage
            ? [
                "You are summarizing a webpage. Identify the website or platform from the URL and use it to frame your summary (e.g. 'A Pinterest pin about...', 'A Medium article on...', 'A GitHub repository for...').",
                "Combine the metadata and the image to write a rich, descriptive summary — the page's purpose, main topic, and key details. The image is the Open Graph preview; use it to add visual detail to your description.",
                noImageMeta,
                metadataBlock,
              ].join("\n")
            : [
                "You are summarizing a webpage. Identify the website or platform from the URL and use it to frame your summary (e.g. 'A Pinterest pin about...', 'An Amazon product listing for...', 'A documentation page on...').",
                "The image is a full-page screenshot — use it together with the metadata to write a rich, descriptive summary of the page's content.",
                "",
                "Classify the page and focus accordingly:",
                ...siteCategories,
                noImageMeta,
                metadataBlock,
              ].join("\n");
          break;
        }

        case "tweet": {
          sentenceInstruction = [
            "You are summarizing a post from Twitter/X. The image is a capture of the post — use it together with the metadata below.",
            "Describe the post's topic and main point concisely.",
            noImageMeta,
            metadataBlock,
          ].join("\n");
          break;
        }

        case "video": {
          sentenceInstruction = [
            "You are summarizing a video. Identify the platform from the URL (e.g. 'A YouTube tutorial on...', 'A Vimeo short film about...', 'A TikTok video showing...').",
            "Combine the metadata and the preview frame to write a rich, descriptive summary — the video's topic, format (tutorial, review, vlog, music video, etc.), and key subject.",
            noImageMeta,
            metadataBlock,
          ].join("\n");
          break;
        }

        default: {
          sentenceInstruction =
            "Describe what you see. Focus on: colors, people (name the person if recognizable: celebrity, actor, fictional character; otherwise man/woman/person), place, objects.";
        }
      }

      promptParts.push(
        "",
        "SENTENCE:",
        sentenceInstruction,
        "For people: always try to identify and name if recognizable — include celebrities, actors, fictional characters, politicians, historical figures; otherwise use man, woman, person.",
      );
      formatLines.push("SENTENCE: <your sentence here>");
    }

    // KEYWORDS section (controlled by imageKeywords toggle)
    if (activeToggles.imageKeywords) {
      const useWebsiteKeywords = contentType === "link";

      const keywordsInstruction = useWebsiteKeywords
        ? [
            "List 20 nouns and short descriptive terms. If you can identify the website or service (e.g. Amazon, GitHub, Notion), include it as a keyword. For recognizable characters: include both the person/character name AND the show, movie, or franchise. Only add the source if confident. Match the image type to one below and include the relevant keywords:",
            ...siteCategories,
            "",
            "Describe only what is in the image. Do NOT include readable text or words from the image.",
          ].join("\n")
        : [
            "List 20 nouns and short descriptive terms. MUST include:",
            "- Objects",
            "- People (name if recognizable: celebrity, actor, fictional character; otherwise man/woman/person)",
            "- Place/setting",
            "- Style, mood, composition type (photo, illustration, diagram, etc.)",
            "For recognizable characters (actors, fictional characters): include both the person/character name AND the show, movie, or franchise they are from. Only add the source if you are confident.",
            "Describe only what is in the image. Do NOT include readable text.",
          ].join("\n");

      promptParts.push("", "KEYWORDS:", keywordsInstruction);
      formatLines.push("KEYWORDS: keyword1, keyword2, keyword3, ...");
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
        ...(context?.description ? [`Description: ${context.description}`] : []),
        ...(context?.url ? [`URL: ${context.url}`] : []),
      );
      formatLines.push("COLLECTIONS: <name> (<confidence>%) per line, or NONE");
    }

    // Skip API call if no prompt sections were added (e.g., only autoAssignCollections on with no collections)
    if (formatLines.length === 0) {
      return {
        image_keywords: [],
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

    let image_keywords: string[] = [];
    if (activeToggles.imageKeywords && text.includes("KEYWORDS:")) {
      const [, keywordsPart] = text.split("KEYWORDS:");
      const keywordsBeforeNext = keywordsPart?.split("OCR_TEXT:")[0]?.split("COLLECTIONS:")[0];
      const rawKeywords = keywordsBeforeNext?.trim() ?? "";
      // Strip outer brackets Gemini may copy from format template
      const keywordsStr = rawKeywords.replace(/^\[(.+)\]$/su, "$1").trim();
      image_keywords = keywordsStr
        .split(/,\s*/u)
        .map((keyword) => keyword.trim())
        .filter(Boolean);
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
