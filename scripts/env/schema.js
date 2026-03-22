// Thanks to https://github.com/t3-oss/create-t3-app/

import { z } from "zod";

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const serverSchema = z.object({
  API_KEY_ENCRYPTION_KEY: z.string(),
  DEV_SUPABASE_SERVICE_KEY: z.string().optional(),
  GOOGLE_GEMINI_TOKEN: z.string(),
  IMAGE_CAPTION_URL: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  PDF_SECRET_KEY: z.string(),
  PDF_URL_SCREENSHOT_API: z.string(),
  RESEND_KEY: z.string().optional(),
  REVALIDATE_SECRET_TOKEN: z.string(),
  SUPABASE_SERVICE_KEY: z.string(),
  UMAMI_ID: z.string().optional(),
  UMAMI_SRC: z.string().optional(),
});

/**
 * You can't destruct `process.env` as a regular object in the Next.js
 * middleware, so you have to do it manually here.
 * @type {{ [k in keyof z.infer<typeof serverSchema>]: z.infer<typeof serverSchema>[k] | undefined }}
 */
export const serverEnvironment = {
  API_KEY_ENCRYPTION_KEY: process.env.API_KEY_ENCRYPTION_KEY,
  DEV_SUPABASE_SERVICE_KEY: process.env.DEV_SUPABASE_SERVICE_KEY,
  GOOGLE_GEMINI_TOKEN: process.env.GOOGLE_GEMINI_TOKEN,
  IMAGE_CAPTION_URL: process.env.IMAGE_CAPTION_URL,
  NODE_ENV: process.env.NODE_ENV,
  PDF_SECRET_KEY: process.env.PDF_SECRET_KEY,
  PDF_URL_SCREENSHOT_API: process.env.PDF_URL_SCREENSHOT_API,
  RESEND_KEY: process.env.RESEND_KEY,
  REVALIDATE_SECRET_TOKEN: process.env.REVALIDATE_SECRET_TOKEN,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  UMAMI_ID: process.env.UMAMI_ID,
  UMAMI_SRC: process.env.UMAMI_SRC,
};

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const clientSchema = z.object({
  NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID: z.string(),
  NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID: z.string(),
  NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL: z.string(),
  NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME: z.string(),
  NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY: z.string(),
  NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_DEV_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  // Needed for sitemap generation
  NEXT_PUBLIC_SITE_URL: z.url()?.optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
});

/**
 * You can't destruct `process.env` as a regular object, so you have to do
 * it manually here. This is because Next.js evaluates this at build time,
 * and only used environment variables are included in the build.
 * @type {{ [k in keyof z.infer<typeof clientSchema>]: z.infer<typeof clientSchema>[k] | undefined }}
 */
export const clientEnvironment = {
  NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID: process.env.NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID,
  NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID: process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID,
  NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL: process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL,
  NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME,
  NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY: process.env.NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY,
  NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DEV_SUPABASE_URL: process.env.NEXT_PUBLIC_DEV_SUPABASE_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Needed for sitemap generation
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
};
