import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod";

export const env = createEnv({
  server: {
    API_KEY_ENCRYPTION_KEY: z.string(),
    CRON_SECRET: z.string().optional(),
    DEV_SUPABASE_SERVICE_KEY: z.string().optional(),
    GOOGLE_GEMINI_TOKEN: z.string(),
    IMAGE_CAPTION_URL: z.string().optional(),
    PDF_SECRET_KEY: z.string(),
    PDF_URL_SCREENSHOT_API: z.string(),
    RESEND_KEY: z.string().optional(),
    REVALIDATE_SECRET_TOKEN: z.string(),
    SUPABASE_SERVICE_KEY: z.string(),
    UMAMI_ID: z.string().optional(),
    UMAMI_SRC: z.string().optional(),
  },
  shared: {
    NODE_ENV: z.enum(["development", "test", "production"]),
  },
  extends: [vercel()],
  experimental__runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
