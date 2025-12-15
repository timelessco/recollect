import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { type StorageHelpersInterface } from "./storageClient";

// R2 configuration
const ACCOUNT_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY;

const PUBLIC_BUCKET_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL;

// R2 credentials are only required in production
// In local dev, storageClient.ts uses Supabase storage instead

// Create S3 client for R2 (only initialized when credentials are available)
const createR2Client = () => {
	if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
		return null;
	}

	return new S3Client({
		region: "auto",
		endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: ACCESS_KEY_ID,
			secretAccessKey: SECRET_ACCESS_KEY,
		},
		// Required for R2 compatibility
		requestChecksumCalculation: "WHEN_REQUIRED",
		responseChecksumValidation: "WHEN_REQUIRED",
	});
};

export const r2Client = createR2Client();

const getR2Client = () => {
	if (!r2Client) {
		throw new Error(
			"R2 client not initialized. Missing Cloudflare R2 environment variables.",
		);
	}

	return r2Client;
};

// Helper functions for R2 operations
export const r2Helpers: StorageHelpersInterface = {
	// List objects in a bucket with prefix
	async listObjects(bucket: string, prefix?: string) {
		const command = new ListObjectsV2Command({
			Bucket: bucket,
			Prefix: prefix,
		});

		try {
			const response = await getR2Client().send(command);
			return { data: response.Contents ?? [], error: null };
		} catch (error) {
			return { data: null, error };
		}
	},

	// Upload object to R2
	async uploadObject(
		bucket: string,
		key: string,
		body: Buffer | Uint8Array,
		contentType?: string,
	) {
		const command = new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
			ContentType: contentType,
		});

		try {
			await getR2Client().send(command);
			return { error: null };
		} catch (error) {
			return { error };
		}
	},

	// Delete single object
	async deleteObject(bucket: string, key: string) {
		const command = new DeleteObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		try {
			await getR2Client().send(command);
			return { error: null };
		} catch (error) {
			return { error };
		}
	},

	// Delete multiple objects
	async deleteObjects(bucket: string, keys: string[]) {
		const command = new DeleteObjectsCommand({
			Bucket: bucket,
			Delete: {
				Objects: keys.map((key) => ({ Key: key })),
			},
		});

		try {
			const response = await getR2Client().send(command);
			return { data: response.Deleted ?? [], error: null };
		} catch (error) {
			return { data: null, error };
		}
	},

	// Generate presigned URL for upload
	async createSignedUploadUrl(bucket: string, key: string, expiresIn = 3_600) {
		const command = new PutObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		try {
			const signedUrl = await getSignedUrl(getR2Client(), command, {
				expiresIn,
			});
			return { data: { signedUrl }, error: null };
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
	) {
		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		try {
			const signedUrl = await getSignedUrl(getR2Client(), command, {
				expiresIn,
			});
			return { data: { signedUrl }, error: null };
		} catch (error) {
			return { data: null, error };
		}
	},

	// Get public URL for public buckets (permanent, no expiration)
	getPublicUrl(path: string) {
		const url = `${PUBLIC_BUCKET_URL}/${path}`;
		return { data: { publicUrl: url }, error: null };
	},

	/**
	 * Creates a long-lived signed URL for persistent file access.
	 * Default expiration: 1 week (604800 seconds)
	 * Use case: Stored references, bookmark thumbnails, profile images
	 */
	async getSignedUrl(bucket: string, key: string, expiresIn = 604_800) {
		// Max expiration is 7 days (604,800 seconds) for R2
		const maxExpiration = Math.min(expiresIn, 604_800);

		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		try {
			const signedUrl = await getSignedUrl(getR2Client(), command, {
				expiresIn: maxExpiration,
			});
			return { data: { signedUrl }, error: null };
		} catch (error) {
			return { data: null, error };
		}
	},
};
