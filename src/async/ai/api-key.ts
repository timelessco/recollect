import { type SupabaseClient } from "@supabase/supabase-js";
import CryptoJS from "crypto-js";

import { PROFILES } from "../../utils/constants";

export const getApikeyAndBookmarkCount = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	// monthly limit, in db the bookmark count set to zero at the start of every month using supabase cron job
	const LIMIT = 10_0000;

	const { data: profile } = await supabase
		.from(PROFILES)
		.select("api_key")
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

	const { data: count, error } = await supabase
		.from(PROFILES)
		.select("bookmark_count")
		.eq("id", userId)
		.single();
	if (error) {
		throw error;
	}

	const bookmarkCount = count?.bookmark_count ?? 0;

	return { userApiKey, isLimitReached: bookmarkCount > LIMIT };
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
