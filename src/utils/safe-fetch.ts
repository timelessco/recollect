import { promises as dnsPromises } from "node:dns";
import { isIP } from "node:net";

import ipaddr from "ipaddr.js";

/**
 * Reject URLs that resolve to private / link-local / loopback / metadata
 * addresses before sending the bytes to a third-party (Vertex, Gemini, etc.).
 *
 * Used by image-fetch paths in src/async/ai/image-embedding.ts and
 * src/async/ai/image-analysis.ts. Without this guard a malicious bookmark
 * with `http://169.254.169.254/` (cloud metadata) or `http://localhost:54321/`
 * (Supabase admin) would have its response forwarded to whichever AI service
 * the worker is calling.
 *
 * IP classification is delegated to `ipaddr.js` (~80M weekly downloads,
 * Express/proxy-addr's underlying lib). Its `.range()` method authoritatively
 * categorizes addresses into `unicast` (the only safe answer here) vs
 * `private` / `loopback` / `linkLocal` / `uniqueLocal` / `carrierGradeNat` /
 * `reserved` / `unspecified` / `broadcast` / `multicast`. The library
 * handles edge cases that hand-rolled regex commonly miss: `100.64.0.0/10`
 * (carrier-grade NAT), `fe80::/10` link-local with all 6 prefix variants,
 * IPv4-mapped IPv6 (`::ffff:a.b.c.d`), `0.0.0.0`, etc.
 *
 * Known limitation — DNS rebinding (TOCTOU): the `assertSafeImageUrl` check
 * resolves DNS once, then `fetch` resolves it again. A pathological
 * attacker-controlled DNS server can return a public IP for the first lookup
 * and a private IP for the second. We accept this for now because the
 * mitigations (single-resolution + connect-by-IP, or a forwarding proxy)
 * each carry real costs: connect-by-IP breaks SNI/Host validation for many
 * CDNs, and a proxy is operational overhead we don't have the budget for.
 * The redirect-chain wrapper below at least re-runs `assertSafeImageUrl`
 * for each Location, so a 3xx into RFC1918 is blocked — but a single-shot
 * DNS-rebind on the first request is not.
 */

const isPrivateAddress = (address: string): boolean => {
  let parsed: ReturnType<typeof ipaddr.parse>;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    // Not a valid literal — caller already gated on `isIP`, so this is
    // only reachable for malformed DNS-resolved values; reject defensively.
    return true;
  }
  // IPv4-mapped IPv6 (`::ffff:a.b.c.d`): unwrap to v4 and re-classify.
  // ipaddr.js classifies the wrapper as `ipv4Mapped` regardless of whether
  // the inner IPv4 is public or private, so we have to dispatch ourselves.
  if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) {
    return parsed.toIPv4Address().range() !== "unicast";
  }
  return parsed.range() !== "unicast";
};

/**
 * Build the allowlist of "our own storage" base URLs from configured env.
 * These are services we control (Supabase storage in dev, R2 in prod) and
 * bypass the SSRF guard entirely — the threat model is "user-supplied URL
 * pointing at private infra," not "our own storage."
 *
 * In local dev `NEXT_PUBLIC_SUPABASE_URL` is `http://127.0.0.1:54321` which
 * would otherwise fail both the https-only and loopback checks below.
 *
 * Allowlist matches on origin + path prefix, not origin alone. R2 public-
 * bucket URLs typically include a bucket path (e.g.
 * `https://pub-xxx.r2.dev/recollect-public`), and Supabase's admin and storage
 * endpoints share an origin — origin-only matching would let any URL on
 * `<project>.supabase.co/auth/v1/admin/...` bypass.
 */
const buildTrustedPrefixes = (): readonly string[] => {
  const prefixes: string[] = [];
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
      const parsed = new URL(value);
      // Normalize to a single trailing slash so `/recollect-public` and
      // `/recollect-public/` both produce the same prefix `…/recollect-public/`.
      const normalizedPath = parsed.pathname.replace(/\/?$/u, "/");
      prefixes.push(`${parsed.origin}${normalizedPath}`);
    } catch {
      // Skip malformed env values; nothing to trust.
    }
  }
  return prefixes;
};

const trustedPrefixes = buildTrustedPrefixes();

const isTrustedTarget = (parsed: URL): boolean => {
  // Augment the candidate path with a trailing slash before matching so a
  // prefix `/bucket/` doesn't accidentally accept `/bucket-evil/file`.
  const candidate = `${parsed.origin}${parsed.pathname.replace(/\/?$/u, "/")}`;
  return trustedPrefixes.some((prefix) => candidate.startsWith(prefix));
};

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

  if (isTrustedTarget(url)) {
    return;
  }

  if (url.protocol !== "https:") {
    throw new Error(`Refusing to fetch non-https URL: ${url.protocol}`);
  }

  const { hostname } = url;
  if (!hostname) {
    throw new Error("URL hostname missing");
  }

  // WHATWG URL spec returns IPv6 hosts in bracketed form (e.g. `[2001:db8::1]`).
  // `isIP` and `dns.lookup` both expect the unwrapped form, so strip the
  // brackets before classification. Non-IPv6 hostnames pass through unchanged.
  const normalizedHost =
    hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

  const literalFamily = isIP(normalizedHost);
  let candidates: string[];
  if (literalFamily) {
    candidates = [normalizedHost];
  } else {
    const lookupResults = await dnsPromises.lookup(normalizedHost, { all: true });
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
