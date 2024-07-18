import { log } from "console";
import { pipeline } from "@xenova/transformers";
import axios from "axios";

type ImageCaptionReturn = Array<{ generated_text: string }> | null;

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

/**
 * Gets the image description from VIT model that is running in huggingface serverless endpoint
 *
 * @param {string} source the ogimage url
 * @returns {ImageCaptionReturn} the image description from the VIT model
 */
const vitModel = async (source: string): Promise<ImageCaptionReturn> => {
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

			return await imgCaptionResponse?.json();
		} catch (error) {
			log("Img caption error", error);
			return null;
		}
	} else {
		log(`ERROR: Img caption failed due to missing tokens in env`);
		return null;
	}
};

/**
 * Gets the image description from Moondream model that is running in huggingface serverless endpoint
 *
 * @param  {string} source the ogimage url
 * @returns {ImageCaptionReturn} the image description from the Moondream model
 */
const moondreamModel = async (source: string): Promise<ImageCaptionReturn> => {
	const isImgCaptionEnvironmentsPresent =
		process.env.MOONDREAM_TOKEN && process.env.MOONDREAM_URL;

	if (isImgCaptionEnvironmentsPresent) {
		const response = await axios.post(
			process.env.MOONDREAM_URL as string,
			{
				inputs: {
					url: source,
					question: "Describe this image",
				},
				parameters: {},
			},
			{
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${process.env.MOONDREAM_TOKEN}`,
					"Content-Type": "application/json",
				},
			},
		);

		const finalReturnFormat = [
			{ generated_text: response?.data?.body?.answer },
		];

		return finalReturnFormat;
	} else {
		log(`ERROR: Moondream Img caption failed due to missing tokens in env`);
		return null;
	}
};

/**
 * Gets the image caption from the Moondream model, if that fails then it gets from the VIT model
 *
 * @param {string} source the ogimage url
 * @returns {ImageCaptionReturn} the image description from the VIT model
 */
export const imageToTextHuggingface = async (source: string) => {
	try {
		return await moondreamModel(source);
	} catch {
		log("Moondream model failed running VIT");
		const vitResponse = await vitModel(source);
		return vitResponse;
	}
};

export default imageToText;
