const TRACKING_PARAMS = new Set([
	"fbclid",
	"gclid",
	"ref",
	"mc_cid",
	"mc_eid",
	"msclkid",
	"twclid",
	"_ga",
	"igshid",
]);

export function normalizeUrl(raw: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return null;
	}

	parsed.hostname = parsed.hostname.toLowerCase();

	for (const key of [...parsed.searchParams.keys()]) {
		if (TRACKING_PARAMS.has(key) || key.startsWith("utm_")) {
			parsed.searchParams.delete(key);
		}
	}

	if (parsed.pathname.endsWith("/") && parsed.pathname !== "/") {
		parsed.pathname = parsed.pathname.slice(0, -1);
	}

	return parsed.toString();
}
