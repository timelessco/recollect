// Self-contained loader — no module imports. Next.js loads this file during
// <Image> SSR on Pages Router routes; any import chain that triggers env
// validation (e.g. via src/utils/constants.ts → @/env/client) can cause the
// module's default export to fail to resolve, surfacing as a misleading
// "customImageLoader is not a function" at runtime. See first SSR hit on
// guest /discover which exposed this.

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
  // process.env used intentionally — NEXT_PUBLIC_* values are inlined by
  // Next.js at build time, so no runtime module resolution is needed here.
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== "production") {
    return src;
  }

  const bucketUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL;
  if (!bucketUrl) {
    return src;
  }

  const parameters = [`width=${width}`, "format=auto", "fit=scale-down", "onerror=redirect"];

  if (quality) {
    parameters.push(`quality=${quality}`);
  }

  return `${bucketUrl}/cdn-cgi/image/${parameters.join(",")}/${normalizeImagePath(src)}`;
}
