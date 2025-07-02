import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 configuration
// const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
// const ACCESS_KEY_ID = process.env.CLOUDFLARE_ACCESS_KEY_ID;
// const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const ACCOUNT_ID = "35c2ade98de5513a613b080fea2b6d5a";
const ACCESS_KEY_ID = "e92dc7eaa714140491afa0310db7dde9";
const SECRET_ACCESS_KEY =
	"cf9a42c6f2d2b7e92e44002f25de249fbb1388fb690971a92ed5ecb37220143a";

const PUBLIC_BUCKET_URL = "https://pub-884cdd33e33840408e526e17ee9ff8c5.r2.dev";

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
	throw new Error("Missing Cloudflare R2 environment variables");
}

// Create S3 client for R2
export const r2Client = new S3Client({
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

// Helper functions for R2 operations
export const r2Helpers = {
	// List objects in a bucket with prefix
	async listObjects(bucket: string, prefix?: string) {
		const command = new ListObjectsV2Command({
			Bucket: bucket,
			Prefix: prefix,
		});

		try {
			const response = await r2Client.send(command);
			return { data: response.Contents || [], error: null };
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
			await r2Client.send(command);
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
			await r2Client.send(command);
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
			const response = await r2Client.send(command);
			return { data: response.Deleted || [], error: null };
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
			const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
			return { data: { signedUrl }, error: null };
		} catch (error) {
			return { data: null, error };
		}
	},

	// Generate presigned URL for download
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
			const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
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

	// Get signed URL with maximum allowed expiration (7 days)
	async getSignedUrl(bucket: string, key: string, expiresIn = 604_800) {
		// Max expiration is 7 days (604,800 seconds) for R2
		const maxExpiration = Math.min(expiresIn, 604_800);

		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		try {
			const signedUrl = await getSignedUrl(r2Client, command, {
				expiresIn: maxExpiration,
			});
			return { data: { signedUrl }, error: null };
		} catch (error) {
			return { data: null, error };
		}
	},
};
