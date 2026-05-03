import type { AiFeaturesToggle } from "@/types/apiTypes";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/api-helpers/axiom";
import { extractErrorFields } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

export interface AiToggles {
  aiSummary: boolean;
  autoAssignCollections: boolean;
  imageKeywords: boolean;
  ocr: boolean;
}

export interface FetchAiTogglesProps {
  supabase: SupabaseClient<Database>;
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
    .maybeSingle();

  if (error) {
    logger.error("fetch_ai_toggles_failed", {
      user_id: userId,
      ...extractErrorFields(error),
    });
    setPayload(getServerContext(), {
      fetch_ai_toggles_error: error.message,
      fetch_ai_toggles_error_code: error.code,
    });
    return {
      aiSummary: false,
      autoAssignCollections: false,
      imageKeywords: false,
      ocr: false,
    };
  }

  const raw = data?.ai_features_toggle;
  const toggles: AiFeaturesToggle | null =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? {
          ai_summary: typeof raw.ai_summary === "boolean" ? raw.ai_summary : undefined,
          auto_assign_collections:
            typeof raw.auto_assign_collections === "boolean"
              ? raw.auto_assign_collections
              : undefined,
          image_keywords: typeof raw.image_keywords === "boolean" ? raw.image_keywords : undefined,
          ocr: typeof raw.ocr === "boolean" ? raw.ocr : undefined,
        }
      : null;

  return {
    aiSummary: toggles?.ai_summary !== false,
    autoAssignCollections: toggles?.auto_assign_collections !== false,
    imageKeywords: toggles?.image_keywords !== false,
    ocr: toggles?.ocr !== false,
  };
}
