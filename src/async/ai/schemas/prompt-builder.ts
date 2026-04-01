import type { ImageToTextContextProps, UserCollection } from "./image-analysis";
import type { AiToggles } from "@/utils/ai-feature-toggles";
import type { BookmarkContentType } from "@/utils/resolve-content-type";

// Metadata helper

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

// Shared prompt constants

const NO_IMAGE_META =
  'Never reference the image itself — no "thumbnail", "screenshot", "OG image", "preview", "the image shows", or "this is a picture of".';

const HUMAN_TONE =
  "Write as if telling a friend what this bookmark is about. Be direct — no filler, no introductory phrases. Start with the key info. Do NOT describe colors, UI elements, or visual style — keywords handle that.";

// Section builders

function buildSentencePrompt(
  contentType: BookmarkContentType,
  context?: ImageToTextContextProps | null,
  isOgImage?: boolean,
): string {
  const metadataBlock = formatMetadataContext(context);

  let instruction: string;

  /* oxlint-disable switch-exhaustiveness-check -- audio is handled by orchestrator early return */
  switch (contentType) {
    case "document": {
      instruction = [
        "Summarize this document. Name the platform if recognizable from the URL.",
        "Cover: subject, document type (report, manual, paper, etc.), key topic.",
        HUMAN_TONE,
        NO_IMAGE_META,
        metadataBlock,
      ].join("\n");
      break;
    }

    case "image": {
      instruction = [
        "Describe what you see: who or what is in the image, where it is, and the context.",
        HUMAN_TONE,
      ].join("\n");
      break;
    }

    case "instagram": {
      instruction = [
        "Summarize this Instagram post — what it's about and its topic.",
        HUMAN_TONE,
        NO_IMAGE_META,
        metadataBlock,
      ].join("\n");
      break;
    }

    case "link": {
      instruction =
        (isOgImage ?? true)
          ? [
              "Summarize this webpage. Name the website/platform from the URL.",
              "Cover: what the page is about, main topic, key details.",
              HUMAN_TONE,
              NO_IMAGE_META,
              metadataBlock,
            ].join("\n")
          : [
              "Summarize this webpage from its screenshot. Name the website/platform from the URL.",
              "Classify and focus accordingly:",
              HUMAN_TONE,
              NO_IMAGE_META,
              metadataBlock,
            ].join("\n");
      break;
    }

    case "tweet": {
      instruction = [
        "Summarize this Twitter/X post — topic and main point.",
        HUMAN_TONE,
        NO_IMAGE_META,
        metadataBlock,
      ].join("\n");
      break;
    }

    case "video": {
      instruction = [
        "Summarize this video. Name the platform from the URL.",
        "Cover: topic, format (tutorial, review, vlog, etc.), key subject.",
        HUMAN_TONE,
        NO_IMAGE_META,
        metadataBlock,
      ].join("\n");
      break;
    }

    default: {
      instruction = [
        "Describe what you see: who or what is in the image, where it is, and the context.",
        HUMAN_TONE,
      ].join("\n");
    }
  }

  return [
    "SENTENCE instructions:",
    instruction,
    "Name recognizable people (celebrities, actors, characters, politicians). Otherwise use man, woman, person.",
  ].join("\n");
}

const KEYWORDS_PROMPT = [
  "KEYWORDS instructions:",
  'For the "type" field, pick 1–3 from this CLOSED list (most specific first):',
  '"article", "blog", "documentation", "infographic", "meme", "newsletter", "recipe", "tutorial", "image", "photo", "poster", "video", "music_album", "podcast", "movie", "tvshow", "anime", "game", "xpost", "instapost", "redditpost", "pin", "thread", "product", "deal", "review", "repo", "portfolio", "webapp", "ecommerce", "streaming", "news", "design", "developer tools", "productivity", "social media", "course", "book", "research_paper", "job", "event", "place", "restaurant", "pdf", "profile", "package", "linkedinpost", "tiktok"',
  "",
  '"people": ONLY named/identifiable people — use their actual name. Include directors, cast, authors. Do NOT output generic labels like man/woman/person — omit if unknown.',
  '"object": physical objects visible in the image.',
  '"place": locations, settings, landmarks.',
  '"color": hex codes, PRIMARY/dominant color FIRST, then secondary colors.',
  "",
  '"features": searchable metadata key-value pairs. String values for most fields.',
  "  Common examples: brand (company/studio, NOT hosting platform), title, author, source, rating, duration, reading_time, model, price (no thousand separators), capacity, director, cast, genre, release_year, runtime, platform, cuisine, cook_time, programming_language, framework, company, salary_range.",
  '  "additional_keywords": an array of 3–8 topic tags (e.g. ["fintech", "crypto wallet", "stablecoin", "payments"]). Think: what would someone search to find this bookmark?',
  "  Add any other relevant metadata — these are examples, not limits.",
  "",
  "Rules:",
  "- Only include type values if ≥85% confident. All other keys: ≥70% confident.",
  "- Omit empty arrays and empty objects.",
  "- No duplicate values. Each keyword/value appears only once.",
  "- Do NOT duplicate OCR body text as keywords. Product identifiers and names ARE keywords.",
].join("\n");

const OCR_PROMPT = [
  "OCR instructions:",
  "Extract all visible, readable text from this image exactly as it appears.",
  "Return null if no text is visible.",
  "Do NOT paraphrase or summarize — copy the text verbatim.",
].join("\n");

function buildCollectionsPrompt(
  collections: UserCollection[],
  context?: ImageToTextContextProps | null,
): string {
  return [
    "COLLECTIONS instructions:",
    "Determine which of the user's existing collections this bookmark belongs to.",
    "Return up to 3 best matches. If nothing fits, return an empty array.",
    "Rules:",
    "- ONLY use collection names from the exact list below — never invent names",
    "- Be strict — a vague or tangential connection should get a LOW confidence (below 50)",
    "- Only give 90+ when the bookmark's primary topic is a direct, obvious match",
    "",
    "User's collections:",
    collections.map((c) => `- ${c.name}`).join("\n"),
    "",
    "Additional bookmark context:",
    ...(context?.title ? [`Title: ${context.title}`] : []),
    ...(context?.url ? [`URL: ${context.url}`] : []),
    ...(context?.description ? [`Description: ${context.description}`] : []),
  ].join("\n");
}

export interface BuildPromptOptions {
  collections: UserCollection[];
  contentType: BookmarkContentType;
  context?: ImageToTextContextProps | null;
  isOgImage?: boolean;
  toggles: AiToggles;
}

/**
 * Builds the prompt string for Gemini structured output.
 *
 * Only includes instruction sections for active toggles. The actual response
 * format is enforced by `responseJsonSchema`, so no format template lines are
 * needed.
 *
 * Returns `null` when no prompt sections are active.
 */
export function buildPrompt(options: BuildPromptOptions): null | string {
  const { collections, contentType, context, isOgImage, toggles } = options;

  const parts: string[] = ["Analyze this image. Respond as JSON matching the provided schema."];
  let hasSections = false;

  if (toggles.aiSummary) {
    parts.push("", buildSentencePrompt(contentType, context, isOgImage));
    hasSections = true;
  }

  if (toggles.imageKeywords) {
    parts.push("", KEYWORDS_PROMPT);
    hasSections = true;
  }

  if (toggles.ocr) {
    parts.push("", OCR_PROMPT);
    hasSections = true;
  }

  if (toggles.autoAssignCollections && collections.length > 0) {
    parts.push("", buildCollectionsPrompt(collections, context));
    hasSections = true;
  }

  if (!hasSections) {
    return null;
  }

  return parts.join("\n");
}
