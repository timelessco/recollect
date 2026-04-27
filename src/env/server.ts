import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod";

export const env = createEnv({
  server: {
    API_KEY_ENCRYPTION_KEY: z.string(),
    AXIOM_DATASET: z.string().optional().default("recollect"),
    AXIOM_TOKEN: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    DEV_SUPABASE_SERVICE_KEY: z.string().optional(),
    // Visual-similarity rollout flags. Both default false so PR merge is a
    // no-op deploy; ops flips them in sequence post-merge.
    EMBEDDINGS_ENABLED: z.enum(["true", "false"]).optional().default("false"),
    // GCP Workload Identity Federation (Vercel OIDC). Optional at the env
    // layer because EMBEDDINGS_ENABLED=false bypasses the auth path entirely.
    // The image-embedding helper asserts presence at first use.
    GCP_PROJECT_ID: z.string().optional(),
    GCP_PROJECT_NUMBER: z.string().optional(),
    GCP_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
    GCP_WORKLOAD_IDENTITY_POOL_ID: z.string().optional(),
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: z.string().optional(),
    GOOGLE_GEMINI_TOKEN: z.string(),
    IMAGE_CAPTION_URL: z.string().optional(),
    PDF_SECRET_KEY: z.string(),
    PDF_URL_SCREENSHOT_API: z.string(),
    RESEND_KEY: z.string().optional(),
    REVALIDATE_SECRET_TOKEN: z.string(),
    SCREENSHOT_API: z.url(),
    // Shadow-log path: when "1", fetch-similar calls both the legacy SQL
    // ranker and the new cosine RPC, returning legacy results while logging
    // Jaccard + latency to Axiom for A/B comparison during cutover.
    SIMILAR_SHADOW: z.enum(["0", "1"]).optional().default("0"),
    SIMILARITY_USE_EMBEDDINGS: z.enum(["true", "false"]).optional().default("false"),
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
