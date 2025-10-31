// Thanks to https://github.com/t3-oss/create-t3-app/

import { z } from "zod";

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const serverSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	SUPABASE_SERVICE_KEY: z.string(),
	UMAMI_SRC: z.string().optional(),
	UMAMI_ID: z.string().optional(),
	SUPABASE_JWT_SECRET_KEY: z.string(),
	SENTRY_DSN: z.string().optional(),
	IMAGE_CAPTION_URL: z.string().optional(),
	DEV_SUPABASE_JWT_SECRET_KEY: z.string().optional(),
	DEV_SUPABASE_SERVICE_KEY: z.string().optional(),
	GOOGLE_GEMINI_TOKEN: z.string(),
});

/**
 * You can't destruct `process.env` as a regular object in the Next.js
 * middleware, so you have to do it manually here.
 *
 * @type {{ [k in keyof z.infer<typeof serverSchema>]: z.infer<typeof serverSchema>[k] | undefined }}
 */
export const serverEnvironment = {
	NODE_ENV: process.env.NODE_ENV,
	SENTRY_DSN: process.env.SENTRY_DSN,
	SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
	UMAMI_SRC: process.env.UMAMI_SRC,
	UMAMI_ID: process.env.UMAMI_ID,
	SUPABASE_JWT_SECRET_KEY: process.env.SUPABASE_JWT_SECRET_KEY,
	IMAGE_CAPTION_URL: process.env.IMAGE_CAPTION_URL,
	DEV_SUPABASE_JWT_SECRET_KEY: process.env.DEV_SUPABASE_JWT_SECRET_KEY,
	DEV_SUPABASE_SERVICE_KEY: process.env.DEV_SUPABASE_SERVICE_KEY,
	GOOGLE_GEMINI_TOKEN: process.env.GOOGLE_GEMINI_TOKEN,
};

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const clientSchema = z.object({
	// Needed for sitemap generation
	NEXT_PUBLIC_SITE_URL: z.string().url()?.optional(),
	NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
	NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
	NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY: z.string().optional(),
	NEXT_PUBLIC_DEV_SUPABASE_URL: z.string().optional(),
	NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID: z.string(),
	NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID: z.string(),
	NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY: z.string(),
	NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL: z.string(),
});

/**
 * You can't destruct `process.env` as a regular object, so you have to do
 * it manually here. This is because Next.js evaluates this at build time,
 * and only used environment variables are included in the build.
 *
 * @type {{ [k in keyof z.infer<typeof clientSchema>]: z.infer<typeof clientSchema>[k] | undefined }}
 */
export const clientEnvironment = {
	// Needed for sitemap generation
	NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
	NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
	NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
	NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY:
		process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY,
	NEXT_PUBLIC_DEV_SUPABASE_URL: process.env.NEXT_PUBLIC_DEV_SUPABASE_URL,
	NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID:
		process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID,
	NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID:
		process.env.NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID,
	NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY:
		process.env.NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY,
	NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL:
		process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL,
};
