import { createHash } from "node:crypto";

import { ExternalAccountClient } from "google-auth-library";
import { z } from "zod";

import type { BaseExternalAccountClient } from "google-auth-library";

import { env } from "@/env/server";
import { MULTIMODAL_EMBEDDING_MODEL_VERSION } from "@/utils/constants";
import { assertSafeImageUrl } from "@/utils/safe-fetch";

/**
 * Vertex AI multimodalembedding@001 caller. Returns a 1408-dim halfvec-ready
 * float array, the L2 norm (so callers can reject degenerate near-zero
 * vectors before INSERT), and a sha256 of the source URL (used as part of
 * the bookmark_embeddings idempotency key).
 *
 * Auth: Vercel OIDC -> GCP Workload Identity Federation. No long-lived
 * service account JSON. The auth client is lazy + memoized — module-scope
 * instantiation would force every importer (Vitest, type-check tooling) to
 * have the GCP_* vars set, and the token cache lives inside the client
 * instance regardless.
 *
 * SSRF: assertSafeImageUrl rejects non-https, RFC1918, loopback, link-local,
 * and IPv4-mapped private IPv6 before any byte leaves the worker.
 *
 * Error sanitization: gaxios errors carry `cause.config.headers.Authorization`
 * with the impersonated GCP access token. We re-throw a generic message so
 * the bearer never reaches Sentry/Axiom even if the caller logs the error.
 */

interface ImageToEmbeddingResult {
  embedding: number[];
  norm: number;
  sourceUrlHash: Buffer;
}

const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL = MULTIMODAL_EMBEDDING_MODEL_VERSION;
const EMBEDDING_DIMENSION = 1408;

// Vertex documents the 20 MB ceiling on the base64-encoded payload, not the
// raw image. Base64 expansion is ~4/3 — a 14 MB raw image lands just under
// the 20 MB request limit after encoding.
const PRE_BASE64_BYTE_LIMIT = 14 * 1024 * 1024;

const SUPPORTED_MIME_TYPES = new Set(["image/bmp", "image/gif", "image/jpeg", "image/png"]);

const VertexResponseSchema = z.object({
  predictions: z
    .array(
      z.object({
        imageEmbedding: z.array(z.number()).length(EMBEDDING_DIMENSION),
      }),
    )
    .min(1),
});

let cachedAuthClient: BaseExternalAccountClient | undefined;

const requireGcpEnv = (): {
  poolId: string;
  projectId: string;
  projectNumber: string;
  providerId: string;
  serviceAccountEmail: string;
} => {
  const {
    GCP_PROJECT_ID,
    GCP_PROJECT_NUMBER,
    GCP_SERVICE_ACCOUNT_EMAIL,
    GCP_WORKLOAD_IDENTITY_POOL_ID,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
  } = env;
  if (
    !GCP_PROJECT_ID ||
    !GCP_PROJECT_NUMBER ||
    !GCP_SERVICE_ACCOUNT_EMAIL ||
    !GCP_WORKLOAD_IDENTITY_POOL_ID ||
    !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
  ) {
    throw new Error("Vertex AI not configured: GCP_* env vars missing (see .env.example)");
  }
  return {
    projectId: GCP_PROJECT_ID,
    projectNumber: GCP_PROJECT_NUMBER,
    serviceAccountEmail: GCP_SERVICE_ACCOUNT_EMAIL,
    poolId: GCP_WORKLOAD_IDENTITY_POOL_ID,
    providerId: GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
  };
};

const getAuthClient = async (): Promise<BaseExternalAccountClient> => {
  if (cachedAuthClient) {
    return cachedAuthClient;
  }
  const gcp = requireGcpEnv();
  // Imported dynamically so test environments without @vercel/functions OIDC
  // support don't hit a ReferenceError at module load.
  const { getVercelOidcToken } = await import("@vercel/functions/oidc");
  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${gcp.projectNumber}/locations/global/workloadIdentityPools/${gcp.poolId}/providers/${gcp.providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${gcp.serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
  });
  if (!client) {
    throw new Error("Failed to construct GCP ExternalAccountClient");
  }
  cachedAuthClient = client;
  return client;
};

const fetchImageBytes = async (imageUrl: string): Promise<{ bytes: Buffer; mime: string }> => {
  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`);
  }
  const rawMime = (response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase();
  const mime = rawMime === "image/jpg" ? "image/jpeg" : rawMime;
  if (!mime || !SUPPORTED_MIME_TYPES.has(mime)) {
    throw new Error(`Unsupported content-type for Vertex multimodal: ${mime ?? "missing"}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("Empty image body");
  }
  if (bytes.byteLength > PRE_BASE64_BYTE_LIMIT) {
    throw new Error(
      `Image exceeds Vertex pre-base64 ceiling (${bytes.byteLength} > ${PRE_BASE64_BYTE_LIMIT})`,
    );
  }
  return { bytes, mime };
};

const callVertexEmbedding = async (bytes: Buffer, accessToken: string): Promise<number[]> => {
  const gcp = requireGcpEnv();
  const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${gcp.projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:predict`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ image: { bytesBase64Encoded: bytes.toString("base64") } }],
      parameters: { dimension: EMBEDDING_DIMENSION },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const responseBody = await response.text();
    const bodyExcerpt = responseBody.slice(0, 500);
    throw new Error(`Vertex ${response.status}`, {
      cause: { source: "vertex", status: response.status, bodyExcerpt },
    });
  }

  const parsed = VertexResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Vertex response schema mismatch");
  }
  return parsed.data.predictions[0].imageEmbedding;
};

const computeNorm = (embedding: number[]): number => {
  let sum = 0;
  for (const value of embedding) {
    sum += value * value;
  }
  return Math.sqrt(sum);
};

/**
 * Embed a bookmark image via Vertex multimodal embedding.
 * Throws on SSRF rejection, image fetch failure, unsupported content-type,
 * size cap, Vertex auth/transport failure, or degenerate (near-zero) output.
 */
export const imageToEmbedding = async (imageUrl: string): Promise<ImageToEmbeddingResult> => {
  await assertSafeImageUrl(imageUrl);
  const { bytes } = await fetchImageBytes(imageUrl);

  let accessToken: string | null | undefined;
  try {
    const client = await getAuthClient();
    const tokenResponse = await client.getAccessToken();
    accessToken = tokenResponse.token;
  } catch {
    throw new Error("Vertex auth failed", {
      cause: { source: "gcp-auth" },
    });
  }
  if (!accessToken) {
    throw new Error("Vertex auth returned empty access token");
  }

  const embedding = await callVertexEmbedding(bytes, accessToken);
  const norm = computeNorm(embedding);
  if (norm < 1e-6) {
    throw new Error("Degenerate (near-zero) embedding from Vertex");
  }
  const sourceUrlHash = createHash("sha256").update(imageUrl).digest();

  return { embedding, norm, sourceUrlHash };
};
