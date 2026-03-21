import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";

import { type AiFeaturesToggle } from "@/types/apiTypes";
import { PROFILES } from "@/utils/constants";

export interface AiToggles {
  aiSummary: boolean;
  autoAssignCollections: boolean;
  imageKeywords: boolean;
  ocr: boolean;
}

export interface FetchAiTogglesProps {
  supabase: SupabaseClient;
  userId: string;
}

/**
 * Fetches AI feature toggles for a user.
 * Undefined/missing keys are treated as enabled (opt-out model).
 */
export async function fetchAiToggles(props: FetchAiTogglesProps): Promise<AiToggles> {
  const { supabase, userId } = props;

  const { data, error } = await supabase
    .from(PROFILES)
    .select("ai_features_toggle")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[fetchAiToggles] Failed to fetch toggles:", {
      userId,
      error: error.message,
    });
    Sentry.captureException(error, {
      tags: { operation: "fetch_ai_toggles", userId },
    });
    return {
      aiSummary: false,
      autoAssignCollections: false,
      imageKeywords: false,
      ocr: false,
    };
  }

  const toggles = data?.ai_features_toggle as AiFeaturesToggle | null;

  return {
    aiSummary: toggles?.ai_summary !== false,
    autoAssignCollections: toggles?.auto_assign_collections !== false,
    imageKeywords: toggles?.image_keywords !== false,
    ocr: toggles?.ocr !== false,
  };
}
