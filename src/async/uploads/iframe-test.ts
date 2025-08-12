import axios, {
	type AxiosResponseHeaders,
	type RawAxiosResponseHeaders,
} from "axios";

export const canEmbedInIframe = async (url: string): Promise<boolean> => {
	// URL validation
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		return false;
	}

	// Skip check for certain protocols
	if (!["http:", "https:"].includes(parsedUrl.protocol)) {
		return false;
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller?.abort(), 5_000);

		const response = await axios?.head(url, {
			signal: controller?.signal,
			validateStatus: (status) => status >= 200 && status < 400,
			maxRedirects: 5,
		});

		clearTimeout(timeoutId);

		return checkIframeHeaders(response?.headers);
	} catch {
		return false;
	}
};

// Narrowed header type for axios responses
type NormalizedHeaders = Record<string, string[] | string>;

// Extracted header checking logic for better testability
const checkIframeHeaders = (
	headers: AxiosResponseHeaders | RawAxiosResponseHeaders,
): boolean => {
	// Normalize header names to lowercase for consistent access
	const normalizedHeaders: NormalizedHeaders = Object?.keys(
		headers,
	)?.reduce<NormalizedHeaders>((accumulator, key) => {
		accumulator[key?.toLowerCase()] = headers[key] as string[] | string;
		return accumulator;
	}, {});

	// X-Frame-Options check
	const xFrameOptions = normalizedHeaders["x-frame-options"];
	if (typeof xFrameOptions === "string") {
		const value = xFrameOptions?.toLowerCase();
		if (
			value === "deny" ||
			value === "sameorigin" ||
			value?.startsWith("allow-from ")
		) {
			return false;
		}
	}

	// CSP frame-ancestors check
	const csp = normalizedHeaders["content-security-policy"];
	if (csp) {
		const policies = Array.isArray(csp) ? csp : [csp];

		for (const policy of policies) {
			const frameAncestorsMatch = /frame-ancestors\s+([^;]+)/iu.exec(policy);
			if (frameAncestorsMatch) {
				const directive = frameAncestorsMatch[1]?.trim()?.toLowerCase();

				if (directive === "'none'" || directive === "'self'") {
					return false;
				}

				// More nuanced check for domain restrictions
				const sources = directive
					?.split(/\s+/u)
					?.filter((source) => source?.length > 0);
				const hasWildcard = sources?.some(
					(source) =>
						source === "*" ||
						source?.includes("*") ||
						source === "'unsafe-inline'",
				);

				if (!hasWildcard) {
					return false;
				}
			}
		}
	}

	return true;
};
