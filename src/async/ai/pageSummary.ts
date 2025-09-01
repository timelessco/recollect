import { GoogleGenerativeAI, type Tool } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_TOKEN as string);

export const pageSummary = async (url: string) => {
	const model = genAI.getGenerativeModel({
		model: "gemini-2.5-flash-lite",
		tools: [{ urlContext: {} }] as unknown as Tool[],
	});
	try {
		const prompt = `
    concise 3 line summary with the key essence of the page.
plus any other key info in JSON format and provide a category name.
and 'books, products, articles, podcasts, music, videos, recipes, discussions, code, art, videos' here is the list of categories under which one this page belongs to.

Format strictly as:
summary:
<summary or 'undefined'>

key_info:
<valid JSON or 'undefined'>

category_name:
<category name or 'undefined'>

If you cannot retrieve or summarize the page, return exactly:
summary:
undefined

key_info:
undefined
(no explanations, no extra words).

    `;

		console.error("Sending prompt to model...");
		const result = await model.generateContent([prompt, url]);
		const response = result.response;
		const text = response.text();
		return {
			data: formatResponse(text),
		};
	} catch (error) {
		console.error("Classification error:", error);
		throw error;
	}
};

const formatResponse = (responseText: string) => {
	// Extract summary
	// eslint-disable-next-line unicorn/better-regex, require-unicode-regexp, regexp/no-super-linear-backtracking
	const summaryMatch = /summary:\s*([\s\S]*?)\nkey_info:/i.exec(responseText);
	const summary = summaryMatch ? summaryMatch[1].trim() : "undefined";

	// Extract key_info JSON
	// eslint-disable-next-line unicorn/better-regex, require-unicode-regexp,
	const keyInfoMatch = /key_info:\s*(\{[\s\S]*\})/i.exec(responseText);
	let keyInfo = "undefined";

	const categoryMatch = /category_name:\s*(\w+)/iu.exec(responseText);
	const categoryName = categoryMatch ? categoryMatch[1].trim() : "undefined";
	if (keyInfoMatch) {
		try {
			keyInfo = JSON.parse(keyInfoMatch[1]);
		} catch (error) {
			console.error("Failed to parse key_info JSON:", error);
		}
	}

	return {
		summary,
		category_name: categoryName,
		key_info: keyInfo,
	};
};
