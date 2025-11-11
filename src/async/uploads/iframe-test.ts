import axios, {
	type AxiosResponseHeaders,
	type RawAxiosResponseHeaders,
} from "axios";

/**
 * Checks if a URL can be embedded in an iframe.
 * Performs a HEAD request and examines X-Frame-Options and CSP headers.
 * @param url - The URL to check
 * @returns boolean indicating if the URL can be embedded
 */
export const canEmbedInIframe = async (url: string): Promise<boolean> => {
	// Validate URL format
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		// Invalid URL cannot be embedded
		return false;
	}

	// Only allow HTTP and HTTPS protocols
	if (!["http:", "https:"].includes(parsedUrl.protocol)) {
		return false;
	}

	try {
		// Abort controller to handle timeout
		const controller = new AbortController();
		// 5 seconds timeout
		const timeoutId = setTimeout(() => controller?.abort(), 5_000);

		// Send HEAD request to minimize data transfer
		const response = await axios?.head(url, {
			signal: controller?.signal,
			// Only allow 2xx and 3xx
			validateStatus: (status) => status >= 200 && status < 400,
			// Avoid infinite redirects
			maxRedirects: 5,
		});
		// Clear timeout on success
		clearTimeout(timeoutId);

		// Check the headers for iframe restrictions
		return checkIframeHeaders(response?.headers);
	} catch {
		// Any error (timeout, network, CORS, etc.) defaults to false
		return false;
	}
};

// Type for normalized headers for easier access
type NormalizedHeaders = Record<string, string[] | string>;

/**
 * Examines response headers to determine if iframe embedding is allowed.
 * @param headers - Axios response headers
 * @returns boolean indicating if embedding is allowed
 */
const checkIframeHeaders = (
	headers: AxiosResponseHeaders | RawAxiosResponseHeaders,
): boolean => {
	// Normalize header names to lowercase for consistent access
	const normalizedHeaders: NormalizedHeaders = Object?.keys(
		headers,
	)?.reduce<NormalizedHeaders>((accumulator, key) => {
		accumulator[key?.toLowerCase()] = headers?.[key] as string[] | string;
		return accumulator;
	}, {});

	// --- X-Frame-Options Check ---
	const xFrameOptions = normalizedHeaders?.["x-frame-options"];
	if (typeof xFrameOptions === "string") {
		const value = xFrameOptions?.toLowerCase();
		if (
			value === "deny" ||
			value === "sameorigin" ||
			value?.startsWith("allow-from ")
		) {
			// cannot embed
			return false;
		}
	}

	// --- Content-Security-Policy frame-ancestors Check ---
	const csp = normalizedHeaders?.["content-security-policy"];
	if (csp) {
		// CSP can be an array or string
		const policies = Array.isArray(csp) ? csp : [csp];

		for (const policy of policies) {
			// Extract frame-ancestors directive
			const frameAncestorsMatch = /frame-ancestors\s+([^;]+)/iu.exec(policy);
			if (frameAncestorsMatch) {
				const directive = frameAncestorsMatch?.[1]?.trim()?.toLowerCase();

				if (directive === "'none'" || directive === "'self'") {
					// embedding is blocked
					return false;
				}

				// Check if directive allows any domain (wildcard or unsafe-inline)
				const sources = directive
					?.split(/\s+/u)
					?.filter((source) => source?.length > 0);

				// If no sources are specified, block embedding
				if (!sources?.length) {
					return false;
				}

				// Check if any source explicitly allows all domains or our specific domain
				const allowsEmbedding = sources.some((source) => {
					// Match any domain (completely open)
					if (source === "*") {
						return true;
					}

					// These are all restrictive cases that would prevent embedding
					if (["'self'", "'none'"].includes(source)) {
						return false;
					}

					// If it's a wildcard domain (like *.example.com), it's restrictive
					// and we can't be sure our domain is allowed
					if (source.includes("*")) {
						return false;
					}

					// Only allow if it's a specific URL that starts with http(s) and has no wildcards
					return source.startsWith("http") && !source.includes("*");
				});

				// If no sources allow embedding, block it
				if (!allowsEmbedding) {
					return false;
				}
			}
		}
	}

	// No restrictive headers found, embedding is allowed
	return true;
};
