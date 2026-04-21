// Self-contained leaf module — do NOT add imports. Next.js bundles this
// file separately (once for SSR, once for the client runtime) to feed
// `images.loaderFile` in next.config.ts. Any transitive import that runs
// side effects at module-init time — notably `@/env/client` (t3-env) via
// `./constants` — can throw during the loader's isolated module evaluation.
// When that happens the `default` export never gets assigned and Next
// reports the misleading "customImageLoader is not a function" the first
// time a route actually renders <Image> during SSR (guest /discover was
// the first such path).

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
  // process.env used intentionally — NEXT_PUBLIC_* vars are inlined by Next
  // at build time, so no runtime env module is needed here.
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
