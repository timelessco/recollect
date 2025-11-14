export const SITE_TITLE = "Recollect";
export const SITE_NAME = "Recollect";
export const SITE_DESCRIPTION =
	"Open source bookmark manager built using Next.js and Supabase. Save and organize your bookmarks, images, and documents in one place.";
export const SITE_EMAIL = "hello@timeless.co";
export const SITE_AUTHOR = "Timeless Team";
export const SITE_SOCIAL_MEDIA_LINKS = {
	github: "https://github.com/timelessco",
	twitter: "https://twitter.com/timelessco",
} as const;
export const SITE_SOCIAL_MEDIA_IDS = {
	twitter: "@timelessco",
} as const;

const productionUrl =
	process.env.NEXT_PUBLIC_SITE_URL ??
	`https://${
		process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
		process.env.VERCEL_PROJECT_PRODUCTION_URL
	}`;
const vercelEnvironment =
	process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
const branchUrl =
	process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL ?? process.env.VERCEL_BRANCH_URL;
const vercelUrl =
	vercelEnvironment === "production" ? productionUrl : `https://${branchUrl}`;

export const BASE_URL =
	process.env.NODE_ENV === "development"
		? `http://localhost:${process.env.PORT ?? 3_000}`
		: vercelUrl;

export const SERVICES_OFFERED = [
	"bookmark manager",
	"bookmark organizer",
	"save bookmarks",
	"image manager",
	"document manager",
	"collections",
	"bookmark tags",
	"bookmark search",
	"open source bookmarks",
	"self-hosted bookmark manager",
] as const;
