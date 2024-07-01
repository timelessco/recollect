import { pipeline } from "@xenova/transformers";

/**
 * Generates the image description from model that is loaded in local machine
 *
 * @param {string} url the image url
 * @returns {string} the description
 */
const imageToText = async (url: string): Promise<string> => {
	const pipe = await pipeline(
		"image-to-text",
		"Xenova/vit-gpt2-image-captioning",
	);
	const output = (await pipe(url)) as Array<{ generated_text: string }>;

	return output?.[0]?.generated_text;
};

export default imageToText;
