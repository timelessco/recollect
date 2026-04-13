import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID: z.string(),
    NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID: z.string(),
    NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL: z.string(),
    NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME: z.string(),
    NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY: z.string(),
    NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY: z.string().optional(),
    // Local-dev only: mirrors DEV_SUPABASE_SERVICE_KEY so browser code can create
    // signed upload URLs against the local Supabase storage. Never set in prod —
    // exposing a service-role key to the client bypasses RLS.
    NEXT_PUBLIC_DEV_SUPABASE_SERVICE_KEY: z.string().optional(),
    NEXT_PUBLIC_DEV_SUPABASE_URL: z.string().optional(),
    NEXT_PUBLIC_LOCAL: z.string().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID: process.env.NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID,
    NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID: process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID,
    NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL: process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL,
    NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME,
    NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY: process.env.NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY,
    NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEV_SUPABASE_SERVICE_KEY: process.env.NEXT_PUBLIC_DEV_SUPABASE_SERVICE_KEY,
    NEXT_PUBLIC_DEV_SUPABASE_URL: process.env.NEXT_PUBLIC_DEV_SUPABASE_URL,
    NEXT_PUBLIC_LOCAL: process.env.NEXT_PUBLIC_LOCAL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
