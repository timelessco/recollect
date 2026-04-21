/**
 * Image URL validation — two layers:
 *
 * 1. `isLikelyValidImageUrl` — synchronous shape check. Rejects URLs that
 *    are obviously unusable (empty, non-http(s), placeholder hostnames like
 *    `undefined`/`null`, single-label non-localhost hosts). Safe in hot paths.
 *
 * 2. `preflightImageUrl` — HEAD-preflight the URL with a 3s budget.
 *    Returns the URL if it looks fetchable as an image, else null. Use at
 *    ingestion boundaries where we'd rather eat a few hundred ms than
 *    persist a dead URL.
 *
 * Background: scrapers occasionally return strings like
 * `https://undefined/opengraph-image.jpg` — produced by Next.js pages whose
 * `metadataBase` is unset. The URL parses, but DNS fails on "undefined". The
 * shape check catches that class; the preflight catches the broader class
 * (dead domains, 404s, non-image content).
 */

const PREFLIGHT_TIMEOUT_MS = 3000;

export function isLikelyValidImageUrl(raw: null | string | undefined): raw is string {
  if (typeof raw !== "string" || raw.trim() === "") {
    return false;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (!host || host === "undefined" || host === "null") {
      return false;
    }
    // Single-label hostnames that aren't localhost can't resolve publicly
    if (!host.includes(".") && host !== "localhost") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function preflightImageUrl(url: string): Promise<null | string> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
    });
    // 403/405 often mean "HEAD unsupported, GET would work" — allow through
    if (response.status === 403 || response.status === 405) {
      return url;
    }
    if (response.status >= 400) {
      return null;
    }
    // Empty content-type is common from CDNs on HEAD; only reject when the
    // server positively says "not an image"
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.startsWith("image/")) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
