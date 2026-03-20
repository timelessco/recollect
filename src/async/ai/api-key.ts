import { type SupabaseClient } from "@supabase/supabase-js";
import CryptoJS from "crypto-js";

import { PROFILES } from "../../utils/constants";

const FREE_MONTHLY_LIMIT = 1;

export const getApikeyAndBookmarkCount = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const { data: profile } = await supabase
		.from(PROFILES)
		.select("api_key, bookmark_count, plan")
		.eq("id", userId)
		.single();

	let userApiKey: string | null = null;
	try {
		const enc = (profile as unknown as { api_key?: string })?.api_key ?? "";
		if (enc) {
			const decryptedBytes = CryptoJS.AES.decrypt(
				enc,
				process.env.API_KEY_ENCRYPTION_KEY,
			);
			const decrypted = decryptedBytes.toString(CryptoJS.enc.Utf8);
			userApiKey = decrypted;
		}
	} catch {
		userApiKey = null;
	}

	const bookmarkCount =
		(profile as { bookmark_count?: number | null })?.bookmark_count ?? 0;
	const plan = (profile as { plan?: string })?.plan ?? "free";
	const isLimitReached = plan === "free" && bookmarkCount > FREE_MONTHLY_LIMIT;

	return { userApiKey, isLimitReached };
};

export const incrementBookmarkCount = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<number | null> => {
	try {
		const { data: profile, error: fetchError } = await supabase
			.from(PROFILES)
			.select("bookmark_count")
			.eq("id", userId)
			.single();

		if (fetchError) {
			throw fetchError;
		}

		const currentCount = profile?.bookmark_count ?? 0;
		const newCount = currentCount + 1;

		const { error: updateError } = await supabase
			.from(PROFILES)
			.update({ bookmark_count: newCount })
			.eq("id", userId);

		if (updateError) {
			throw updateError;
		}

		return newCount;
	} catch (error) {
		console.error("Error incrementing bookmark count:", error);
		return null;
	}
};
