import { env } from "@/env/client";

const DEV_SUPABASE_URL = env.NEXT_PUBLIC_DEV_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;

const DEV_SUPABASE_ANON_KEY =
  env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// process.env used intentionally — server secrets, can't import server env in shared file
const DEV_SUPABASE_SERVICE_KEY =
  process.env.DEV_SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

// process.env used intentionally — NODE_ENV inlined by Next.js
export const SUPABASE_URL =
  process.env.NODE_ENV === "development" ? DEV_SUPABASE_URL : env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.NODE_ENV === "development"
    ? DEV_SUPABASE_ANON_KEY
    : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_SERVICE_KEY =
  process.env.NODE_ENV === "development"
    ? DEV_SUPABASE_SERVICE_KEY
    : process.env.SUPABASE_SERVICE_KEY;
