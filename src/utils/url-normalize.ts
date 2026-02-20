const TRACKING_PARAMS = new Set([
	"_ga",
	"fbclid",
	"gclid",
	"igshid",
	"mc_cid",
	"mc_eid",
	"msclkid",
	"ref",
	"twclid",
]);

export function normalizeUrl(raw: string | null): string | null {
	if (!raw) {
		return null;
	}

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return null;
	}

	parsed.hostname = parsed.hostname.toLowerCase();

	for (const key of parsed.searchParams.keys()) {
		if (TRACKING_PARAMS.has(key) || key.startsWith("utm_")) {
			parsed.searchParams.delete(key);
		}
	}

	if (parsed.pathname.endsWith("/") && parsed.pathname !== "/") {
		parsed.pathname = parsed.pathname.slice(0, -1);
	}

	return parsed.href;
}
