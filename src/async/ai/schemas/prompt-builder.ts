import type { ImageToTextContextProps, UserCollection } from "./image-analysis-schema";
import type { AiToggles } from "@/utils/ai-feature-toggles";
import type { BookmarkContentType } from "@/utils/resolve-content-type";

// System instruction — passed as config.systemInstruction in the Gemini API call
export const SYSTEM_INSTRUCTION = [
  "You are a bookmark metadata extraction system.",
  "Analyze bookmark images and extract structured metadata for search and organization.",
  "Base your analysis on the image and any provided metadata.",
  "Do not hallucinate — never invent URLs, names, dates, or facts not supported by the image or metadata.",
].join(" ");

// Context block — metadata appears once at the top of the prompt
function buildContextBlock(context?: ImageToTextContextProps | null): string {
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

  if (lines.length === 0) {
    return "";
  }

  return ["<context>", ...lines, "</context>"].join("\n");
}

// Few-shot example — conditionally includes collections line
function buildExampleBlock(includeCollections: boolean): string {
  const outputLines = [
    "{",
    '  "sentence": "A blog post on example.com explaining React Server Components — covers how they work and when to use them.",',
    '  "type": ["blog", "article"],',
    '  "color": ["#1a1a2e", "#e94560"],',
    '  "features": {',
    '    "title": "Understanding RSC",',
    '    "source": "example.com",',
    '    "programming_language": "JavaScript",',
    '    "framework": "React",',
    '    "additional_keywords": ["react", "server components", "RSC", "web development"]',
    "  },",
    `  "ocr_text": "Understanding React Server Components\\nA deep dive into the future of React rendering..."${includeCollections ? "," : ""}`,
    ...(includeCollections
      ? ['  "collections": [{ "name": "Development", "confidence": 95 }]']
      : []),
    "}",
  ];

  return [
    "<example>",
    "Input: A tech blog bookmark with OG image preview.",
    'Context — Title: "Understanding RSC", URL: "https://example.com/blog/rsc"',
    "",
    "Output:",
    ...outputLines,
    "",
    "The example shows all possible fields. Only produce fields present in the response schema.",
    "</example>",
  ].join("\n");
}

// Sentence section builder
function buildSentenceSection(contentType: BookmarkContentType, isOgImage?: boolean): string {
  let instruction: string;

  /* oxlint-disable switch-exhaustiveness-check -- audio is handled by orchestrator early return */
  switch (contentType) {
    case "document": {
      instruction = [
        "Summarize this document. Name the platform if recognizable from the URL.",
        "Cover: subject, document type (report, manual, paper, etc.), key topic.",
      ].join("\n");
      break;
    }

    case "image": {
      instruction =
        "Describe what you see: who or what is in the image, where it is, and the context.";
      break;
    }

    case "instagram": {
      instruction = "Summarize this Instagram post — what it's about and its topic.";
      break;
    }

    case "link": {
      instruction =
        (isOgImage ?? true)
          ? [
              "Summarize this webpage. Name the website/platform from the URL.",
              "Cover: what the page is about, main topic, key details.",
            ].join("\n")
          : [
              "Summarize this webpage from its screenshot. Name the website/platform from the URL.",
              "Classify and focus accordingly.",
            ].join("\n");
      break;
    }

    case "tweet": {
      instruction = "Summarize this Twitter/X post — topic and main point.";
      break;
    }

    case "video": {
      instruction = [
        "Summarize this video. Name the platform from the URL.",
        "Cover: topic, format (tutorial, review, vlog, etc.), key subject.",
      ].join("\n");
      break;
    }

    default: {
      instruction =
        "Describe what you see: who or what is in the image, where it is, and the context.";
    }
  }

  const suppressImageMeta = contentType !== "image";

  return [
    "<sentence>",
    instruction,
    "",
    "Do:",
    "- Start with the key info. Be direct — no filler or introductory phrases.",
    "- Name recognizable people (celebrities, actors, characters, politicians).",
    "- Use context metadata (title, URL, description) to inform your summary.",
    "",
    "Don't:",
    "- Describe colors, UI elements, or visual style — keywords handle that.",
    ...(suppressImageMeta
      ? [
          '- Reference the image itself — no "thumbnail", "screenshot", "OG image", "preview", "the image shows".',
        ]
      : []),
    "- Repeat or paraphrase the metadata description verbatim.",
    "</sentence>",
  ].join("\n");
}

// Keywords section
const KEYWORDS_SECTION = [
  "<keywords>",
  "Extract ALL applicable keyword fields for this image. Each field you can fill should be filled.",
  "",
  '"type": Pick 1–3 from this CLOSED list (most specific first):',
  '"article", "blog", "documentation", "infographic", "meme", "newsletter", "recipe", "tutorial", "image", "photo", "poster", "video", "music_album", "podcast", "movie", "tvshow", "anime", "game", "xpost", "instapost", "redditpost", "pin", "thread", "product", "deal", "review", "repo", "portfolio", "webapp", "ecommerce", "streaming", "news", "design", "developer tools", "productivity", "social media", "course", "book", "research_paper", "job", "event", "place", "restaurant", "pdf", "profile", "package", "linkedinpost", "tiktok"',
  "",
  '"people": ONLY named/identifiable people — use actual names. Include directors, cast, authors. Omit if no one is identifiable.',
  '"object": Physical objects visible in the image.',
  '"place": Locations, settings, landmarks.',
  '"color": ALWAYS extract hex color codes when colors are visible. Primary/dominant color FIRST, then secondary.',
  "",
  '"features": Searchable metadata key-value pairs (string values).',
  "  Examples: brand (company/studio, NOT hosting platform), title, author, source, rating, duration, reading_time, model, price (no thousand separators), capacity, director, cast, genre, release_year, runtime, platform, cuisine, cook_time, programming_language, framework, company, salary_range.",
  '  "additional_keywords": ALWAYS include 3–8 topic tags. Think: what would someone search to find this bookmark?',
  "  Add any other relevant metadata — these are examples, not limits.",
  "",
  "Rules:",
  "- Only include type values if ≥85% confident. All other keys: ≥70% confident.",
  "- Omit empty arrays and empty objects.",
  "- No duplicate values. Each keyword/value appears only once.",
  "- Do NOT duplicate OCR body text as keywords. Product identifiers and names ARE keywords.",
  "</keywords>",
].join("\n");

// OCR section
const OCR_SECTION = [
  "<ocr>",
  "Extract all visible, readable text from this image exactly as it appears.",
  "Return null if no text is visible.",
  "",
  "Do:",
  "- Copy text verbatim — preserve original line breaks and structure.",
  "",
  "Don't:",
  "- Paraphrase, summarize, or reformat the text.",
  "- Add formatting or structure not present in the original.",
  "</ocr>",
].join("\n");

// Collections section builder
function buildCollectionsSection(collections: UserCollection[]): string {
  return [
    "<collections>",
    "Determine which of the user's existing collections this bookmark belongs to.",
    "Return up to 3 best matches. If nothing fits, return an empty array.",
    "",
    "User's collections:",
    collections.map((c) => `- ${c.name}`).join("\n"),
    "",
    "Do:",
    "- Only use collection names from the exact list above.",
    "- Give 90+ confidence only when the primary topic is a direct, obvious match.",
    "- Use context metadata (title, URL, description) to inform your matching.",
    "",
    "Don't:",
    "- Invent collection names not in the list.",
    "- Give high confidence (50+) for vague or tangential connections.",
    "</collections>",
  ].join("\n");
}

// Public types and builder
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
 * Structure: task directive → context → few-shot example → conditional sections.
 * Role/grounding handled via SYSTEM_INSTRUCTION (config.systemInstruction).
 *
 * Returns `null` when no prompt sections are active.
 */
export function buildPrompt(options: BuildPromptOptions): null | string {
  const { collections, contentType, context, isOgImage, toggles } = options;

  const sections: string[] = [];

  if (toggles.aiSummary) {
    sections.push(buildSentenceSection(contentType, isOgImage));
  }

  if (toggles.imageKeywords) {
    sections.push(KEYWORDS_SECTION);
  }

  if (toggles.ocr) {
    sections.push(OCR_SECTION);
  }

  if (toggles.autoAssignCollections && collections.length > 0) {
    sections.push(buildCollectionsSection(collections));
  }

  if (sections.length === 0) {
    return null;
  }

  // Assemble: directive → context → example → task sections
  const parts: string[] = ["Analyze this image and respond as JSON matching the provided schema."];

  const contextBlock = buildContextBlock(context);

  if (contextBlock) {
    parts.push("", contextBlock);
  }

  const includeCollections = toggles.autoAssignCollections && collections.length > 0;
  parts.push("", buildExampleBlock(includeCollections));

  for (const section of sections) {
    parts.push("", section);
  }

  return parts.join("\n");
}
