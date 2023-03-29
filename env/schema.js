// Thanks to https://github.com/t3-oss/create-t3-app/

/* eslint-disable node/no-process-env */
import { z } from "zod";

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const serverSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	TEST_USER_EMAIL: z.string().email(),
	TEST_USER_PASSWORD: z.string(),
	SUPABASE_SERVICE_KEY: z.string(),
	SUPABASE_JWT_SECRET_KEY: z.string(),
	GOOGLE_ID: z.string(),
	GOOGLE_SECRET: z.string(),
	GOOGLE_REFRESH_TOKEN: z.string(),
});

/**
 * You can't destruct `process.env` as a regular object in the Next.js
 * middleware, so you have to do it manually here.
 *
 * @type {{ [k in keyof z.infer<typeof serverSchema>]: z.infer<typeof serverSchema>[k] | undefined }}
 */
export const serverEnvironment = {
	NODE_ENV: process.env.NODE_ENV,
	TEST_USER_EMAIL: process.env.TEST_USER_EMAIL,
	GOOGLE_ID: process.env.GOOGLE_ID,
	GOOGLE_SECRET: process.env.GOOGLE_SECRET,
	SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
	SUPABASE_JWT_SECRET_KEY: process.env.SUPABASE_JWT_SECRET_KEY,
	GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
	TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD,
};

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const clientSchema = z.object({
	// Needed for sitemap generation
	NEXT_PUBLIC_SITE_URL: z.string().url(),
	NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
	NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
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
};
