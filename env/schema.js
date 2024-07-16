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
	RECOLLECT_SERVER_API: z.string().optional(),
	UMAMI_ID: z.string().optional(),
	SUPABASE_JWT_SECRET_KEY: z.string(),
	SENDGRID_KEY: z.string().optional(),
	SENTRY_DSN: z.string().optional(),
	SCREENSHOT_TOKEN: z.string().optional(),
	SCREENSHOT_API: z.string().optional(),
	IMAGE_CAPTION_URL: z.string().optional(),
	IMAGE_CAPTION_TOKEN: z.string().optional(),
	DEV_SUPABASE_JWT_SECRET_KEY: z.string().optional(),
	DEV_SUPABASE_SERVICE_KEY: z.string().optional(),
});

/**
 * You can't destruct `process.env` as a regular object in the Next.js
 * middleware, so you have to do it manually here.
 *
 * @type {{ [k in keyof z.infer<typeof serverSchema>]: z.infer<typeof serverSchema>[k] | undefined }}
 */
export const serverEnvironment = {
	NODE_ENV: process.env.NODE_ENV,
	SENDGRID_KEY: process.env.SENDGRID_KEY,
	SENTRY_DSN: process.env.SENTRY_DSN,
	SCREENSHOT_TOKEN: process.env.SCREENSHOT_TOKEN,
	SCREENSHOT_API: process.env.SCREENSHOT_API,
	SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
	UMAMI_SRC: process.env.UMAMI_SRC,
	RECOLLECT_SERVER_API: process.env.RECOLLECT_SERVER_API,
	UMAMI_ID: process.env.UMAMI_ID,
	SUPABASE_JWT_SECRET_KEY: process.env.SUPABASE_JWT_SECRET_KEY,
	IMAGE_CAPTION_URL: process.env.IMAGE_CAPTION_URL,
	IMAGE_CAPTION_TOKEN: process.env.IMAGE_CAPTION_TOKEN,
	DEV_SUPABASE_JWT_SECRET_KEY: process.env.DEV_SUPABASE_JWT_SECRET_KEY,
	DEV_SUPABASE_SERVICE_KEY: process.env.DEV_SUPABASE_SERVICE_KEY,
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
	NEXT_PUBLIC_VERCEL_URL: z.string(),
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
	NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
};
