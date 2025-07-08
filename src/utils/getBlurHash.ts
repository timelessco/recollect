import { encode } from "blurhash";
import sizeOf from "image-size";
import fetch from "node-fetch";
import sharp from "sharp";

export type IOptions = {
	offline?: boolean;
	size?: number;
};

export type IOutput = {
	encoded: string;
	height: number | undefined;
	width: number | undefined;
};

/**
 * Generate a Blurhash string from a given image URL or local path.
 *
 * @param {string} source - The image URL or local path to the image file.
 * @param {IOptions} [options] - The optional configuration options.
 * @param {number} [options.size] - The desired size of the image for encoding the Blurhash.
 * @param {boolean} [options.offline] - Set to `true` if the image source is a local path, `false` if it's a URL.
 * @returns {Promise<IOutput>} The Promise that resolves to the encoded Blurhash string, along with the image width and height.
 * @default
 * @default
 * @example
 * ```js
 * import { blurhashFromURL } from "blurhash-from-url";
 *
 * const output = await blurhashFromURL("https://i.imgur.com/NhfEdg2.png", {
 *    size: 32,
 * });
 *
 * console.log(output);
 * ```
 */
export const blurhashFromURL = async (
	source: string,
	options: IOptions = {},
): Promise<IOutput> => {
	const { size = 32, offline = false } = options;

	let height;
	let returnedBuffer;
	let width;

	// if (offline) {
	// 	const fs = await import("fs");
	// 	const { width: localWidth, height: localHeight } = sizeOf(source);
	// 	width = localWidth;
	// 	height = localHeight;
	// 	returnedBuffer = await sharp(fs.readFileSync(source)).toBuffer();
	// } else {
	// 	const response = await fetch(source);
	// 	const arrayBuffer = await response.arrayBuffer();
	// 	returnedBuffer = Buffer.from(arrayBuffer);

	// 	const { width: remoteWidth, height: remoteHeight } = sizeOf(returnedBuffer);
	// 	width = remoteWidth;
	// 	height = remoteHeight;
	// }

	// const { info, data } = await sharp(returnedBuffer)
	// 	.resize(size, size, {
	// 		fit: "inside",
	// 	})
	// 	.ensureAlpha()
	// 	.raw()
	// 	.toBuffer({
	// 		resolveWithObject: true,
	// 	});

	// const encoded = encode(
	// 	new Uint8ClampedArray(data),
	// 	info.width,
	// 	info.height,
	// 	4,
	// 	4,
	// );

	// const output: IOutput = {
	// 	encoded,
	// 	width,
	// 	height,
	// };

	// return output;

	return {
		encoded: "",
		height: undefined,
		width: undefined,
	};
};
