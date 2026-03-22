import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { SUPABASE_SERVICE_KEY, SUPABASE_URL } from "./constants";

/**
 * Creates a Supabase server client with SERVICE KEY.
 * This bypasses RLS - use only for server-side operations where
 * RLS would otherwise block access (e.g., storage operations in local dev).
 *
 * WARNING: Never expose this client to the browser.
 */
export const createServerServiceClient = () =>
  createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
