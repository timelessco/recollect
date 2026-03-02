import { type SupabaseClient } from "@supabase/supabase-js";

import { type ImageToTextResult } from "@/async/ai/imageToText";
import { type AiFeaturesToggle } from "@/types/apiTypes";
import { PROFILES } from "@/utils/constants";

export interface AiToggles {
	aiSummary: boolean;
	autoAssignCollections: boolean;
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
export async function fetchAiToggles(
	props: FetchAiTogglesProps,
): Promise<AiToggles> {
	const { supabase, userId } = props;

	const { data } = await supabase
		.from(PROFILES)
		.select("ai_features_toggle")
		.eq("id", userId)
		.single();

	const toggles = data?.ai_features_toggle as AiFeaturesToggle | null;

	return {
		aiSummary: toggles?.ai_summary !== false,
		autoAssignCollections: toggles?.auto_assign_collections !== false,
		ocr: toggles?.ocr !== false,
	};
}

export interface ApplyAiToggleMaskProps {
	result: ImageToTextResult;
	toggles: AiToggles;
}

/**
 * Nulls out disabled AI feature results based on user toggles.
 * The full Gemini call is always made; this filters the output before saving.
 */
export function applyAiToggleMask(
	props: ApplyAiToggleMaskProps,
): ImageToTextResult {
	const { result, toggles } = props;

	return {
		sentence: toggles.aiSummary ? result.sentence : null,
		image_keywords: toggles.aiSummary ? result.image_keywords : [],
		ocr_text: toggles.ocr ? result.ocr_text : null,
		matched_collection_ids: toggles.autoAssignCollections
			? result.matched_collection_ids
			: [],
	};
}
