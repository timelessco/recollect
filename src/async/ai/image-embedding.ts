import { createHash } from "node:crypto";

import { ExternalAccountClient, GoogleAuth } from "google-auth-library";
import { z } from "zod";

import type { AuthClient, BaseExternalAccountClient } from "google-auth-library";

import { env } from "@/env/server";
import { MULTIMODAL_EMBEDDING_MODEL_VERSION } from "@/utils/constants";
import { safeFetch } from "@/utils/safe-fetch";

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

let cachedAuthClient: AuthClient | BaseExternalAccountClient | undefined;

const requireProjectId = (): string => {
  const id = env.GCP_PROJECT_ID;
  if (!id) {
    throw new Error("Vertex AI not configured: GCP_PROJECT_ID missing");
  }
  return id;
};

const requireWifEnv = (): {
  poolId: string;
  projectNumber: string;
  providerId: string;
  serviceAccountEmail: string;
} => {
  const {
    GCP_PROJECT_NUMBER,
    GCP_SERVICE_ACCOUNT_EMAIL,
    GCP_WORKLOAD_IDENTITY_POOL_ID,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
  } = env;
  if (
    !GCP_PROJECT_NUMBER ||
    !GCP_SERVICE_ACCOUNT_EMAIL ||
    !GCP_WORKLOAD_IDENTITY_POOL_ID ||
    !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
  ) {
    throw new Error("Vertex AI WIF not configured: GCP_* env vars missing (see .env.example)");
  }
  return {
    poolId: GCP_WORKLOAD_IDENTITY_POOL_ID,
    projectNumber: GCP_PROJECT_NUMBER,
    providerId: GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
    serviceAccountEmail: GCP_SERVICE_ACCOUNT_EMAIL,
  };
};

const getAuthClient = async (): Promise<AuthClient | BaseExternalAccountClient> => {
  if (cachedAuthClient) {
    return cachedAuthClient;
  }

  // Local development path: GOOGLE_APPLICATION_CREDENTIALS points at a
  // service account key file. Standard Google convention; works anywhere
  // outside Vercel. Production uses Vercel OIDC + WIF below.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const localClient = await auth.getClient();
    cachedAuthClient = localClient;
    return localClient;
  }

  const wif = requireWifEnv();
  // Imported dynamically so test environments without @vercel/functions OIDC
  // support don't hit a ReferenceError at module load.
  const { getVercelOidcToken } = await import("@vercel/functions/oidc");
  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${wif.projectNumber}/locations/global/workloadIdentityPools/${wif.poolId}/providers/${wif.providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${wif.serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
  });
  if (!client) {
    throw new Error("Failed to construct GCP ExternalAccountClient");
  }
  cachedAuthClient = client;
  return client;
};

const fetchImageBytes = async (imageUrl: string): Promise<{ bytes: Buffer; mime: string }> => {
  // safeFetch validates the URL (and any redirect targets) against the SSRF
  // allowlist, follows redirects manually, and refuses to follow into private
  // address space.
  const response = await safeFetch(imageUrl, {
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
  // Reject early if Content-Length declares a body larger than we accept.
  // Without this, a malicious-but-public host that passes the SSRF allowlist
  // could stream hundreds of MB before the post-buffer size check fires.
  const declaredLength = Number(response.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > PRE_BASE64_BYTE_LIMIT) {
    throw new Error(
      `Image exceeds Vertex pre-base64 ceiling (declared ${declaredLength} > ${PRE_BASE64_BYTE_LIMIT})`,
    );
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
  const projectId = requireProjectId();
  const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:predict`;

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
  // safeFetch (inside fetchImageBytes) handles the SSRF guard + redirect chain.
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
