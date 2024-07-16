import { log } from "console";
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

// this func gets the image caption. This uses huggingface serverless api
export const imageToTextHuggingface = async (source: string) => {
	const isImgCaptionEnvironmentsPresent =
		process.env.IMAGE_CAPTION_TOKEN && process.env.IMAGE_CAPTION_URL;

	if (isImgCaptionEnvironmentsPresent) {
		const response = await fetch(source);
		const arrayBuffer = await response.arrayBuffer();
		const data = Buffer.from(arrayBuffer);

		try {
			const imgCaptionResponse = await fetch(
				process.env.IMAGE_CAPTION_URL as string,
				{
					headers: {
						Authorization: `Bearer ${process.env.IMAGE_CAPTION_TOKEN}`,
					},
					method: "POST",
					body: data,
				},
			);

			return imgCaptionResponse;
		} catch (error) {
			log("Img caption error", error);
			return null;
		}
	} else {
		log(`ERROR: Img caption failed due to missing tokens in env`);
		return null;
	}
};

export default imageToText;
