import { CF_IMAGE_LOADER_URL } from "./constants";

const normalizeImagePath = (imagePath: string): string =>
  imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;

interface CloudflareImageLoaderProps {
  quality?: number;
  src: string;
  width: number;
}

export default function cloudflareImageLoader({
  quality,
  src,
  width,
}: CloudflareImageLoaderProps): string {
  // process.env used intentionally — NEXT_PUBLIC_VERCEL_ENV inlined by Next.js
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== "production") {
    return src;
  }

  const parameters = [`width=${width}`, "format=auto", "fit=scale-down", "onerror=redirect"];

  if (quality) {
    parameters.push(`quality=${quality}`);
  }

  const parametersString = parameters?.join(",");

  return `${CF_IMAGE_LOADER_URL}/${parametersString}/${normalizeImagePath(src)}`;
}
