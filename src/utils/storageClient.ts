import { env } from "@/env/client";

import { R2_MAIN_BUCKET_NAME } from "./constants";
import { r2Helpers } from "./r2Client";
import { createServiceClient } from "./supabaseClient";

// process.env used intentionally — NODE_ENV inlined by Next.js
// Environment detection
const isProductionEnvironment = process.env.NODE_ENV === "production";
const hasDevSupabase = Boolean(env.NEXT_PUBLIC_DEV_SUPABASE_URL);

// Use local Supabase storage in development when dev Supabase is configured
export const useLocalStorage = !isProductionEnvironment && hasDevSupabase;

// Public URL base for storage
export const getStoragePublicBaseUrl = () => {
  if (useLocalStorage) {
    return `${env.NEXT_PUBLIC_DEV_SUPABASE_URL}/storage/v1/object/public/${R2_MAIN_BUCKET_NAME}`;
  }

  return env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL ?? "";
};

// Helper to convert relative Supabase URLs to absolute URLs
const toAbsoluteUrl = (url: string): string => {
  if (url.startsWith("/")) {
    return `${env.NEXT_PUBLIC_DEV_SUPABASE_URL}/storage/v1${url}`;
  }

  return url;
};

// Type definitions matching r2Helpers
export interface ListResult {
  data: { Key?: string }[] | null;
  error: unknown;
}

export interface UploadResult {
  error: unknown;
}

export interface DeleteResult {
  error: unknown;
}

export interface DeleteMultipleResult {
  data: { Key?: string }[] | null;
  error: unknown;
}

export interface SignedUrlResult {
  data: { signedUrl: string } | null;
  error: unknown;
}

export interface PublicUrlResult {
  data: { publicUrl: string };
  error: null;
}

// Shared interface for both Supabase and R2 storage implementations
export interface StorageHelpersInterface {
  createSignedDownloadUrl: (
    bucket: string,
    key: string,
    expiresIn?: number,
  ) => Promise<SignedUrlResult>;
  createSignedUploadUrl: (
    bucket: string,
    key: string,
    expiresIn?: number,
  ) => Promise<SignedUrlResult>;
  deleteObject: (bucket: string, key: string) => Promise<DeleteResult>;
  deleteObjects: (bucket: string, keys: string[]) => Promise<DeleteMultipleResult>;
  getPublicUrl: (path: string) => PublicUrlResult;
  getSignedUrl: (bucket: string, key: string, expiresIn?: number) => Promise<SignedUrlResult>;
  listObjects: (bucket: string, prefix?: string) => Promise<ListResult>;
  uploadObject: (
    bucket: string,
    key: string,
    body: Buffer | Uint8Array,
    contentType?: string,
  ) => Promise<UploadResult>;
}

// Supabase Storage implementation
const supabaseStorageHelpers: StorageHelpersInterface = {
  /**
   * Creates a short-lived signed URL for immediate file downloads.
   * Default expiration: 1 hour (3600 seconds)
   * Use case: Immediate download links, temporary access
   */
  async createSignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn = 3600,
  ): Promise<SignedUrlResult> {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, expiresIn);

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

  async createSignedUploadUrl(
    bucket: string,
    key: string,
    // Supabase createSignedUploadUrl doesn't support custom expiration
    _expiresIn = 3600,
  ): Promise<SignedUrlResult> {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(key);

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

  async deleteObject(bucket: string, key: string): Promise<DeleteResult> {
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.storage.from(bucket).remove([key]);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  async deleteObjects(bucket: string, keys: string[]): Promise<DeleteMultipleResult> {
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

  getPublicUrl(path: string): PublicUrlResult {
    const publicUrl = `${getStoragePublicBaseUrl()}/${path}`;
    return { data: { publicUrl }, error: null };
  },

  /**
   * Creates a long-lived signed URL for persistent file access.
   * Default expiration: 1 week (604800 seconds)
   * Use case: Stored references, bookmark thumbnails, profile images
   */
  async getSignedUrl(bucket: string, key: string, expiresIn = 604_800): Promise<SignedUrlResult> {
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
};

// Export the appropriate storage helpers based on environment
export const storageHelpers = useLocalStorage ? supabaseStorageHelpers : r2Helpers;
