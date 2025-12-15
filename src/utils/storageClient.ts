import { R2_MAIN_BUCKET_NAME } from "./constants";
import { r2Helpers } from "./r2Client";
import { createServiceClient } from "./supabaseClient";

// Environment detection
const isProductionEnvironment = process.env.NODE_ENV === "production";
const hasDevSupabase = Boolean(process.env.NEXT_PUBLIC_DEV_SUPABASE_URL);

// Use local Supabase storage in development when dev Supabase is configured
export const useLocalStorage = !isProductionEnvironment && hasDevSupabase;

// Public URL base for storage
export const getStoragePublicBaseUrl = () => {
	if (useLocalStorage) {
		return `${process.env.NEXT_PUBLIC_DEV_SUPABASE_URL}/storage/v1/object/public/${R2_MAIN_BUCKET_NAME}`;
	}

	return process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL ?? "";
};

// Helper to convert relative Supabase URLs to absolute URLs
const toAbsoluteUrl = (url: string): string => {
	if (url.startsWith("/")) {
		return `${process.env.NEXT_PUBLIC_DEV_SUPABASE_URL}/storage/v1${url}`;
	}

	return url;
};

// Type definitions matching r2Helpers
export type ListResult = {
	data: Array<{ Key?: string }> | null;
	error: unknown;
};

export type UploadResult = {
	error: unknown;
};

export type DeleteResult = {
	error: unknown;
};

export type DeleteMultipleResult = {
	data: Array<{ Key?: string }> | null;
	error: unknown;
};

export type SignedUrlResult = {
	data: { signedUrl: string } | null;
	error: unknown;
};

export type PublicUrlResult = {
	data: { publicUrl: string };
	error: null;
};

// Shared interface for both Supabase and R2 storage implementations
export interface StorageHelpersInterface {
	listObjects: (bucket: string, prefix?: string) => Promise<ListResult>;
	uploadObject: (
		bucket: string,
		key: string,
		body: Buffer | Uint8Array,
		contentType?: string,
	) => Promise<UploadResult>;
	deleteObject: (bucket: string, key: string) => Promise<DeleteResult>;
	deleteObjects: (
		bucket: string,
		keys: string[],
	) => Promise<DeleteMultipleResult>;
	createSignedUploadUrl: (
		bucket: string,
		key: string,
		expiresIn?: number,
	) => Promise<SignedUrlResult>;
	createSignedDownloadUrl: (
		bucket: string,
		key: string,
		expiresIn?: number,
	) => Promise<SignedUrlResult>;
	getPublicUrl: (path: string) => PublicUrlResult;
	getSignedUrl: (
		bucket: string,
		key: string,
		expiresIn?: number,
	) => Promise<SignedUrlResult>;
}

// Supabase Storage implementation
const supabaseStorageHelpers: StorageHelpersInterface = {
	async listObjects(bucket: string, prefix?: string): Promise<ListResult> {
		try {
			const supabase = createServiceClient();
			const { data, error } = await supabase.storage.from(bucket).list(prefix);

			if (error) {
				return { data: null, error };
			}

			// Transform to match R2 format
			const contents =
				data?.map((file) => ({
					Key: prefix ? `${prefix}/${file.name}` : file.name,
				})) ?? [];

			return { data: contents, error: null };
		} catch (error) {
			return { data: null, error };
		}
	},

	async uploadObject(
		bucket: string,
		key: string,
		body: Buffer | Uint8Array,
		contentType?: string,
	): Promise<UploadResult> {
		try {
			const supabase = createServiceClient();
			const { error } = await supabase.storage.from(bucket).upload(key, body, {
				contentType,
				upsert: true,
			});

			return { error };
		} catch (error) {
			return { error };
		}
	},

	async deleteObject(bucket: string, key: string): Promise<DeleteResult> {
		try {
			const supabase = createServiceClient();
			const { error } = await supabase.storage.from(bucket).remove([key]);

			return { error };
		} catch (error) {
			return { error };
		}
	},

	async deleteObjects(
		bucket: string,
		keys: string[],
	): Promise<DeleteMultipleResult> {
		try {
			const supabase = createServiceClient();
			const { data, error } = await supabase.storage.from(bucket).remove(keys);

			if (error) {
				return { data: null, error };
			}

			// Transform to match R2 format
			const deleted = data?.map((file) => ({ Key: file.name })) ?? [];

			return { data: deleted, error: null };
		} catch (error) {
			return { data: null, error };
		}
	},

	async createSignedUploadUrl(
		bucket: string,
		key: string,
		// Supabase createSignedUploadUrl doesn't support custom expiration
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_expiresIn = 3_600,
	): Promise<SignedUrlResult> {
		try {
			const supabase = createServiceClient();
			const { data, error } = await supabase.storage
				.from(bucket)
				.createSignedUploadUrl(key);

			if (error || !data) {
				return { data: null, error };
			}

			// Supabase returns relative URLs - convert to absolute
			return {
				data: { signedUrl: toAbsoluteUrl(data.signedUrl) },
				error: null,
			};
		} catch (error) {
			return { data: null, error };
		}
	},

	/**
	 * Creates a short-lived signed URL for immediate file downloads.
	 * Default expiration: 1 hour (3600 seconds)
	 * Use case: Immediate download links, temporary access
	 */
	async createSignedDownloadUrl(
		bucket: string,
		key: string,
		expiresIn = 3_600,
	): Promise<SignedUrlResult> {
		try {
			const supabase = createServiceClient();
			const { data, error } = await supabase.storage
				.from(bucket)
				.createSignedUrl(key, expiresIn);

			if (error || !data) {
				return { data: null, error };
			}

			// Supabase returns relative URLs - convert to absolute
			return {
				data: { signedUrl: toAbsoluteUrl(data.signedUrl) },
				error: null,
			};
		} catch (error) {
			return { data: null, error };
		}
	},

	getPublicUrl(path: string): PublicUrlResult {
		const publicUrl = `${getStoragePublicBaseUrl()}/${path}`;
		return { data: { publicUrl }, error: null };
	},

	/**
	 * Creates a long-lived signed URL for persistent file access.
	 * Default expiration: 1 week (604800 seconds)
	 * Use case: Stored references, bookmark thumbnails, profile images
	 */
	async getSignedUrl(
		bucket: string,
		key: string,
		expiresIn = 604_800,
	): Promise<SignedUrlResult> {
		// Max expiration for Supabase is also limited
		const maxExpiration = Math.min(expiresIn, 604_800);

		try {
			const supabase = createServiceClient();
			const { data, error } = await supabase.storage
				.from(bucket)
				.createSignedUrl(key, maxExpiration);

			if (error || !data) {
				return { data: null, error };
			}

			// Supabase returns relative URLs - convert to absolute
			return {
				data: { signedUrl: toAbsoluteUrl(data.signedUrl) },
				error: null,
			};
		} catch (error) {
			return { data: null, error };
		}
	},
};

// Export the appropriate storage helpers based on environment
export const storageHelpers = useLocalStorage
	? supabaseStorageHelpers
	: r2Helpers;
