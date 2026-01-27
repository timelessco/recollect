/**
 * Domain utility functions for normalizing, checking, and manipulating domain arrays
 */

/**
 * Normalizes a domain string by extracting hostname from URLs
 * Handles URLs with or without protocol (http/https)
 * @param input - Domain string or URL
 * @returns Normalized domain (lowercase, without www.) or null if invalid
 */
export const normalizeDomain = (input: string): string | null => {
	try {
		const url = input.includes("://")
			? new URL(input)
			: new URL(`https://${input}`);
		const hostname = url.hostname.toLowerCase();
		return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
	} catch {
		return null;
	}
};

/**
 * Extracts domain from a valid URL
 * Assumes input is already a valid URL
 * @param url - Valid URL string
 * @returns Domain (lowercase, without www.) or null if invalid
 */
export const getDomain = (url: string): string | null => {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase();
		return host.startsWith("www.") ? host.slice(4) : host;
	} catch {
		return null;
	}
};

/**
 * Checks if a domain exists in an array (case-insensitive)
 * @param domains - Array of domain strings
 * @param domain - Domain to check for
 * @returns True if domain exists in array
 */
export const hasDomain = (domains: string[], domain: string): boolean =>
	domains.some(
		(existingDomain) => existingDomain.toLowerCase() === domain.toLowerCase(),
	);

/**
 * Toggles a domain in an array: adds if absent, removes if present
 * @param domains - Array of domain strings
 * @param domain - Domain to toggle
 * @returns New array with domain toggled
 */
export const toggleDomainInArray = (
	domains: string[],
	domain: string,
): string[] => {
	const hasDomain = domains.some(
		(existingDomain) => existingDomain.toLowerCase() === domain.toLowerCase(),
	);

	return hasDomain
		? domains.filter(
				(existingDomain) =>
					existingDomain.toLowerCase() !== domain.toLowerCase(),
			)
		: [...domains, domain];
};
