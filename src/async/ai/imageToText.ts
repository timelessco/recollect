import { GoogleGenerativeAI } from "@google/generative-ai";
import { type SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";

import { getApikeyAndBookmarkCount, incrementBookmarkCount } from "./api-key";

export type UserCollection = {
	id: number;
	name: string;
};

export type ImageToTextContextProps = {
	collections: UserCollection[];
	description?: string | null;
	title?: string | null;
	url?: string | null;
};

export type ImageToTextResult = {
	image_keywords: string[];
	matched_collection_ids: number[];
	ocr_text: string | null;
	sentence: string | null;
};

export type ImageToTextOptions = {
	isPageScreenshot?: boolean;
};

/**
 * Generates the image description using Gemini AI
 * @param imageUrl the image url
 * @param supabase supabase client
 * @param userId the user id
 * @param options optional - isPageScreenshot when true, describes the website/service; when false/undefined, describes the subject
 * @returns sentence (detailed description) and image_keywords (nouns for search)
 */
export const imageToText = async (
	imageUrl: string,
	supabase: SupabaseClient,
	userId: string,
	options?: ImageToTextOptions | null,
	context?: ImageToTextContextProps | null,
): Promise<ImageToTextResult | null> => {
	try {
		const { userApiKey, isLimitReached } = await getApikeyAndBookmarkCount(
			supabase,
			userId,
		);

		if (!userApiKey && isLimitReached) {
			console.warn("Monthly free limit reached — skipping caption generation.");
			return null;
		}

		// Fetch the image
		const imageResponse = await axios.get(imageUrl, {
			responseType: "arraybuffer",
		});
		const imageBytes = Buffer.from(imageResponse.data).toString("base64");

		// Initialize the model
		const key = userApiKey ?? (process.env.GOOGLE_GEMINI_TOKEN as string);

		const genAI = new GoogleGenerativeAI(key);
		const model = genAI.getGenerativeModel({
			model: "gemini-flash-lite-latest",
		});

		// For Image Caption: sentence + keywords. OCR handles text separately - do not include readable text.
		const isPageScreenshot = options?.isPageScreenshot === true;

		const siteCategories = [
			"- ARTICLE/DOCUMENTATION (blog, news, docs, Notion, wiki) → prefer when you see headings, sections, code blocks, or long-form content. Capture the actual intent: what is the content trying to teach, explain, or communicate? Include: page title, main topic, the core message or takeaway (e.g. 'how to style HTML in Tailwind', 'best practices for image attributes'), key concepts, color palette, style.",
			"- ECOMMERCE (product page, shop, listing) → explain what the product is (type, purpose, key features), brand, product name/model, colors, actual price (write without thousand separators, e.g. ₹8295 not ₹8,295), delivery options. State specific values when visible.",
			"- IMAGE/CONTENT (photo, artwork, product shot, person, place) → colors, people (name the person if recognizable: celebrity, actor, fictional character; otherwise man/woman/person), place/setting, objects, style, mood, composition type. Ignore minimal chrome.",
			"- NORMAL WEBSITE (landing, app, dashboard) → key text/headlines, colors, gist of what the site does, UI elements (nav, sidebar, forms, charts), site type or purpose.",
		];

		const websiteInstruction = isPageScreenshot
			? [
					"This image may be from a website. Try to recognize which website or service it is (by logo, branding, layout, visible URL, or distinctive UI) and use that as context.",
					"",
					"Use your judgment and focus on:",
					...siteCategories,
					"",
					"Start as if describing the content directly. Do NOT say 'screenshot of', 'this appears to be a screenshot', 'the image shows', or meta-labels for website type (e.g. 'a normal website', 'an ecommerce page', 'a documentation page', 'an article') — describe what the page shows (e.g. 'A landing page for...', 'A product listing for...', 'A page titled...').",
					'Do not start with "The image shows" or "This is a picture of".',
				].join("\n")
			: [
					"Describe what you see. Focus on: colors, people (name the person if recognizable: celebrity, actor, fictional character; otherwise man/woman/person), place, objects.",
				].join("\n");

		const keywordsInstruction = isPageScreenshot
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

		const collections = context?.collections ?? [];
		const hasCollections = collections.length > 0;

		const ocrSection = [
			"",
			"PART 3 - OCR TEXT:",
			"Extract all visible, readable text from this image exactly as it appears.",
			"If no text is visible, write NONE.",
			"Do NOT paraphrase or summarize — copy the text verbatim.",
		];

		const collectionsSection = hasCollections
			? [
					"",
					"PART 4 - COLLECTIONS:",
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
					...(context?.description
						? [`Description: ${context.description}`]
						: []),
					...(context?.url ? [`URL: ${context.url}`] : []),
				]
			: [];

		const captionPrompt = [
			"Analyze this image and provide the following parts.",
			"",
			"PART 1 - SENTENCE:",
			websiteInstruction,
			"For people: always try to identify and name if recognizable — include celebrities, actors, fictional characters, politicians, historical figures; otherwise use man, woman, person.",
			"",
			"PART 2 - KEYWORDS:",
			keywordsInstruction,
			...ocrSection,
			...collectionsSection,
			"",
			"Respond in exactly this format:",
			"SENTENCE: [your sentence here]",
			"KEYWORDS: [keyword1, keyword2, keyword3, ...]",
			"OCR_TEXT: [extracted text, or NONE]",
			...(hasCollections
				? ["COLLECTIONS: <name> (<confidence>%) per line, or NONE"]
				: []),
		].join("\n");
		const captionResult = await model.generateContent([
			captionPrompt,
			{
				inlineData: {
					mimeType: "image/jpeg",
					data: imageBytes,
				},
			},
		]);

		const text = captionResult.response.text();
		if (!text?.trim()) {
			return null;
		}

		const sentencePart = text.split("KEYWORDS:")[0];
		const sentenceMatch = /SENTENCE:\s*(.+)/su.exec(sentencePart ?? "");
		let sentence = sentenceMatch?.[1]?.trim() ?? null;

		const keywordsPart = text.includes("KEYWORDS:")
			? text.split("KEYWORDS:")[1]
			: "";
		const keywordsBeforeOcr = keywordsPart
			?.split("OCR_TEXT:")[0]
			?.split("COLLECTIONS:")[0];
		const keywordsStr = keywordsBeforeOcr?.trim() ?? "";
		const image_keywords = keywordsStr
			.split(/,\s*/u)
			.map((keyword) => keyword.trim())
			.filter(Boolean);

		const ocrPart = text.includes("OCR_TEXT:")
			? text.split("OCR_TEXT:")[1]?.split("COLLECTIONS:")[0]?.trim()
			: null;
		const ocr_text = ocrPart && !/^none$/iu.test(ocrPart) ? ocrPart : null;

		// Parse collections — each line is "CollectionName (XX%)", filter >= 90%
		const CONFIDENCE_THRESHOLD = 90;
		const matched_collection_ids: number[] = [];
		if (hasCollections && text.includes("COLLECTIONS:")) {
			const collectionsPart = text.split("COLLECTIONS:")[1]?.trim() ?? "";

			if (!/^none$/iu.test(collectionsPart.split("\n")[0]?.trim() ?? "")) {
				const collectionNameToId = new Map(
					collections.map((collection) => [
						collection.name.toLowerCase(),
						collection.id,
					]),
				);

				// Extract all "Name (XX%)" entries — handles both comma-separated and multi-line
				const entryPattern = /([^,(]+)\((\d+)%?\)/gu;
				let entryMatch;

				while ((entryMatch = entryPattern.exec(collectionsPart)) !== null) {
					const name = entryMatch[1]?.trim() ?? "";
					const confidence = Number(entryMatch[2]);
					const collectionId = collectionNameToId.get(name.toLowerCase());

					if (
						collectionId !== undefined &&
						confidence >= CONFIDENCE_THRESHOLD
					) {
						matched_collection_ids.push(collectionId);
					}
				}
			}
		}

		if (!sentence && text.trim()) {
			sentence = text.trim();
		}

		if (!userApiKey && (ocr_text || sentence)) {
			await incrementBookmarkCount(supabase, userId);
		}

		return { sentence, image_keywords, matched_collection_ids, ocr_text };
	} catch (error) {
		console.error("Image caption error", error);
		throw error;
	}
};

export default imageToText;
