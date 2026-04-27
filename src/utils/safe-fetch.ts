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
  /^fe80:/i,
  /^fc/i,
  /^fd/i,
  /^::ffff:/i,
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
 * Throws if `rawUrl` should not be fetched server-side. Resolves DNS for
 * hostnames so an attacker cannot point a domain at a private IP.
 */
export const assertSafeImageUrl = async (rawUrl: string): Promise<void> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
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
