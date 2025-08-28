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
	// Force WebP format and set optimization level for better compression
	const parameters = [`width=${width}`, "format=webp", "optimize=medium"];

	if (quality) {
		parameters.push(`quality=${quality}`);
	}

	const parametersString = parameters?.join(",");

	return `https://recollect.so/cdn-cgi/image/${parametersString}/${normalizeImagePath(
		src,
	)}`;
}
