import { CF_IMAGE_LOADER_URL } from "./constants";

const normalizeImagePath = (imagePath: string): string =>
	imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;

type CloudflareImageLoaderProps = {
	quality?: number;
	src: string;
	width: number;
};

export default function cloudflareImageLoader({
	src,
	width,
	quality,
}: CloudflareImageLoaderProps): string {
	// eslint-disable-next-line no-console
	console.log("testing log~~~~~", process.env.VERCEL_ENV);
	// if (process.env.NODE_ENV === "development") {
	// 	return src;
	// }

	if (process.env.VERCEL_ENV !== "production") {
		return src;
	}

	const parameters = [`width=${width}`, "format=auto", "fit=scale-down"];

	if (quality) {
		parameters.push(`quality=${quality}`);
	}

	const parametersString = parameters?.join(",");

	return `${CF_IMAGE_LOADER_URL}/${parametersString}/${normalizeImagePath(
		src,
	)}`;
}
