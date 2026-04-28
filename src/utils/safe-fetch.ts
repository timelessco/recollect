import { promises as dnsPromises } from "node:dns";
import { isIP } from "node:net";

/**
 * Reject URLs that resolve to private / link-local / loopback / metadata
 * addresses before sending the bytes to a third-party (Vertex, Gemini, etc.).
 *
 * Used by image-fetch paths in src/async/ai/image-embedding.ts and
 * src/async/ai/image-analysis.ts. Without this guard a malicious bookmark
 * with `http://169.254.169.254/` (cloud metadata), `http://localhost:54321/`
 * (Supabase admin), or a redirect chain into RFC1918 space would have its
 * response forwarded to whichever AI service the worker is calling.
 */

const PRIVATE_IPV4_PATTERNS: readonly RegExp[] = [
  /^10\./,
  /^192\.168\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
  /^127\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

const PRIVATE_IPV6_PATTERNS: readonly RegExp[] = [
  /^::1$/,
  /^::$/,
  // RFC 4291 link-local is fe80::/10 — covers fe80–febf, not just fe80.
  /^fe[89ab][0-9a-f]?:/i,
  /^fc/i,
  /^fd/i,
  // Note: IPv4-mapped (::ffff:*) is intentionally NOT a blanket reject — that
  // would over-block legitimate public mapped addresses like ::ffff:8.8.8.8.
  // Mapped private IPv4 is handled below via dotted-quad extraction.
];

const isPrivateIPv4 = (address: string): boolean =>
  PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(address));

const isPrivateIPv6 = (address: string): boolean => {
  if (PRIVATE_IPV6_PATTERNS.some((pattern) => pattern.test(address))) {
    return true;
  }
  const mapped = /^::ffff:([0-9.]+)$/i.exec(address);
  if (mapped?.[1] && isIP(mapped[1]) === 4) {
    return isPrivateIPv4(mapped[1]);
  }
  return false;
};

const isPrivateAddress = (address: string): boolean => {
  const family = isIP(address);
  if (family === 4) {
    return isPrivateIPv4(address);
  }
  if (family === 6) {
    return isPrivateIPv6(address);
  }
  return false;
};

/**
 * Build the allowlist of "our own storage" origins from configured env. These
 * are services we control (Supabase storage in dev, R2 in prod) and bypass
 * the SSRF guard entirely — the threat model is "user-supplied URL pointing
 * at private infra," not "our own storage."
 *
 * In local dev `NEXT_PUBLIC_SUPABASE_URL` is `http://127.0.0.1:54321` which
 * would otherwise fail both the https-only and loopback checks below.
 */
const buildTrustedOrigins = (): ReadonlySet<string> => {
  const origins = new Set<string>();
  for (const envKey of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_DEV_SUPABASE_URL",
    "NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL",
  ]) {
    const value = process.env[envKey];
    if (!value) {
      continue;
    }
    try {
      origins.add(new URL(value).origin);
    } catch {
      // Skip malformed env values; nothing to trust.
    }
  }
  return origins;
};

const trustedOrigins = buildTrustedOrigins();

/**
 * Throws if `rawUrl` should not be fetched server-side. Resolves DNS for
 * hostnames so an attacker cannot point a domain at a private IP.
 *
 * Trusted origins (configured Supabase + R2 hosts) bypass all checks — they
 * are services this app controls.
 */
export const assertSafeImageUrl = async (rawUrl: string): Promise<void> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (trustedOrigins.has(url.origin)) {
    return;
  }

  if (url.protocol !== "https:") {
    throw new Error(`Refusing to fetch non-https URL: ${url.protocol}`);
  }

  const { hostname } = url;
  if (!hostname) {
    throw new Error("URL hostname missing");
  }

  const literalFamily = isIP(hostname);
  let candidates: string[];
  if (literalFamily) {
    candidates = [hostname];
  } else {
    const lookupResults = await dnsPromises.lookup(hostname, { all: true });
    candidates = lookupResults.map(({ address }) => address);
  }

  for (const address of candidates) {
    if (isPrivateAddress(address)) {
      throw new Error(`Refusing to fetch private address: ${address}`);
    }
  }
};

const MAX_REDIRECTS = 5;

/**
 * SSRF-safe `fetch`. Validates the input URL via `assertSafeImageUrl`, then
 * follows up to MAX_REDIRECTS redirects manually — re-validating each Location
 * header before the next request. Without this wrapper, Node's default
 * `redirect: "follow"` lets an attacker-controlled domain (which passes the
 * initial allowlist) serve a 3xx into RFC1918 / loopback space and the SSRF
 * guard is bypassed.
 *
 * Callers get a normal `Response` and don't have to think about redirects.
 */
export const safeFetch = async (rawUrl: string, init?: RequestInit): Promise<Response> => {
  let currentUrl = rawUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    await assertSafeImageUrl(currentUrl);
    const response = await fetch(currentUrl, { ...init, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) {
      return response;
    }
    const location = response.headers.get("location");
    if (!location) {
      return response;
    }
    // Resolve relative redirects against the current URL.
    currentUrl = new URL(location, currentUrl).href;
  }
  throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
};
