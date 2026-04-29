import { getVercelOidcToken } from "@vercel/functions/oidc";
import { ExternalAccountClient, GoogleAuth } from "google-auth-library";
import { z } from "zod";

import type { AuthClient, BaseExternalAccountClient } from "google-auth-library";

import { env } from "@/env/server";
import { MULTIMODAL_EMBEDDING_MODEL_VERSION } from "@/utils/constants";

/**
 * Auth: Vercel OIDC -> GCP Workload Identity Federation. The auth client is
 * built once at module load and reused across invocations. ExternalAccountClient
 * itself caches access tokens and refreshes via expiry_date.
 *
 * Error sanitization: gaxios errors carry `cause.config.headers.Authorization`
 * with the impersonated GCP access token. We re-throw a generic message so
 * the bearer never reaches Sentry/Axiom even if the caller logs the error.
 */

interface ImageToEmbeddingResult {
  embedding: number[];
  norm: number;
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

const requireProjectId = (): string => {
  const id = env.GCP_PROJECT_ID;
  if (!id) {
    throw new Error("Vertex AI not configured: GCP_PROJECT_ID missing");
  }
  return id;
};

const buildWifClient = (): BaseExternalAccountClient | undefined => {
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
    return undefined;
  }
  return (
    ExternalAccountClient.fromJSON({
      type: "external_account",
      audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
      // Arrow wrapper (vs bare `getSubjectToken: getVercelOidcToken`) reconciles
      // the parameter-type mismatch: getVercelOidcToken takes
      // GetVercelOidcTokenOptions, getSubjectToken expects ExternalAccountSupplierContext.
      subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
    }) ?? undefined
  );
};

// Built once at module load. `undefined` when GCP_* are absent (tests,
// type-check, environments where Vertex isn't wired up) — getAuthClient()
// asserts presence at call time so non-embedding code paths stay unaware.
//
// `GoogleAuth` is a wrapper that resolves the actual `AuthClient` via async
// `.getClient()`; `ExternalAccountClient.fromJSON` returns the client directly.
const authSource: GoogleAuth | BaseExternalAccountClient | undefined = process.env
  .GOOGLE_APPLICATION_CREDENTIALS
  ? new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] })
  : buildWifClient();

let resolvedLocalClient: AuthClient | undefined;

const getAuthClient = async (): Promise<AuthClient | BaseExternalAccountClient> => {
  if (!authSource) {
    throw new Error("Vertex AI not configured: GCP_* env vars missing (see .env.example)");
  }
  if (authSource instanceof GoogleAuth) {
    resolvedLocalClient ??= await authSource.getClient();
    return resolvedLocalClient;
  }
  return authSource;
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

export const imageToEmbedding = async (imageUrl: string): Promise<ImageToEmbeddingResult> => {
  // Run image fetch and auth in parallel — they're independent, and the auth
  // path can take 50-500ms on cold-start (WIF handshake). Catch in the IIFE
  // so the gaxios cause never escapes with the impersonated bearer token.
  const tokenPromise = (async (): Promise<string> => {
    try {
      const client = await getAuthClient();
      const tokenResponse = await client.getAccessToken();
      if (!tokenResponse.token) {
        throw new Error("empty token");
      }
      return tokenResponse.token;
    } catch {
      throw new Error("Vertex auth failed", { cause: { source: "gcp-auth" } });
    }
  })();

  const [{ bytes }, accessToken] = await Promise.all([fetchImageBytes(imageUrl), tokenPromise]);

  const embedding = await callVertexEmbedding(bytes, accessToken);
  const norm = computeNorm(embedding);
  if (norm < 1e-6) {
    throw new Error("Degenerate (near-zero) embedding from Vertex");
  }

  return { embedding, norm };
};
