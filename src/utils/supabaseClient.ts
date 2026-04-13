import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/env/client";

import { isProductionEnvironment } from "./supabaseServerClient";

// in case the user did not add the supabase dev keys in env file then even in dev mode the app will point out to the prod keys mentioned in the env file
// the below ternary conditions handel this logic
const developmentSupabaseUrl = env.NEXT_PUBLIC_DEV_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;

const developmentSupabaseAnonKey =
  env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// process.env used intentionally — server secrets, can't import server env in shared file.
// NEXT_PUBLIC_DEV_SUPABASE_SERVICE_KEY is a local-dev escape hatch that lets browser code
// (signed upload URL creation) hit local Supabase storage. Only read in non-prod — never
// falls back to a server-only key that would be undefined client-side.
const developmentSupabaseServiceKey =
  env.NEXT_PUBLIC_DEV_SUPABASE_SERVICE_KEY ??
  process.env.DEV_SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_KEY;

export const supabaseUrl = !isProductionEnvironment
  ? developmentSupabaseUrl
  : env.NEXT_PUBLIC_SUPABASE_URL;

export const supabaseAnonKey = !isProductionEnvironment
  ? developmentSupabaseAnonKey
  : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseServiceKey = !isProductionEnvironment
  ? developmentSupabaseServiceKey
  : process.env.SUPABASE_SERVICE_KEY;

export const createClient = () => {
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  return supabase;
};

export const createServiceClient = () => {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_KEY is not configured");
  }

  const supabase = createBrowserClient(supabaseUrl, supabaseServiceKey);

  return supabase;
};
