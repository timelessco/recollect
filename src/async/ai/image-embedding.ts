import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { env } from "@/env/server";
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL_VERSION } from "@/utils/constants";

/**
 * Gemini Embedding 2 caller. Returns a 1536-dim halfvec-ready float array
 * (Matryoshka truncation from the model's native 3072) plus the L2 norm,
 * so callers can reject degenerate near-zero vectors before INSERT.
 *
 * Auth: Gemini API key (env.GOOGLE_GEMINI_TOKEN). Server-owned workload —
 * the user's BYO key (used by image-analysis.ts) is intentionally NOT
 * consulted here. Embeddings must run for every bookmark regardless of
 * whether the user has set up a personal key, and must come from a single
 * paid-tier billing surface so similarity space stays consistent across
 * the corpus.
 */

interface ImageToEmbeddingResult {
  embedding: number[];
  norm: number;
}

// Gemini's inline-data ceiling is 20 MB on the base64-encoded payload, not
// the raw image. Base64 expansion is ~4/3 — a 14 MB raw image lands just
// under the request limit after encoding.
const PRE_BASE64_BYTE_LIMIT = 14 * 1024 * 1024;

const SUPPORTED_MIME_TYPES = new Set([
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EmbedResponseSchema = z.object({
  embeddings: z
    .array(
      z.object({
        values: z.array(z.number()).length(EMBEDDING_DIMENSION),
      }),
    )
    .min(1),
});

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
    throw new Error(`Unsupported content-type for Gemini multimodal: ${mime ?? "missing"}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("Empty image body");
  }
  if (bytes.byteLength > PRE_BASE64_BYTE_LIMIT) {
    throw new Error(
      `Image exceeds Gemini pre-base64 ceiling (${bytes.byteLength} > ${PRE_BASE64_BYTE_LIMIT})`,
    );
  }
  return { bytes, mime };
};

const computeNorm = (embedding: number[]): number => {
  let sum = 0;
  for (const value of embedding) {
    sum += value * value;
  }
  return Math.sqrt(sum);
};

/**
 * Embed a bookmark image via Gemini Embedding 2.
 * Throws on image fetch failure, unsupported content-type, size cap,
 * Gemini transport failure, or degenerate (near-zero) output.
 */
export const imageToEmbedding = async (imageUrl: string): Promise<ImageToEmbeddingResult> => {
  const { bytes, mime } = await fetchImageBytes(imageUrl);

  const ai = new GoogleGenAI({ apiKey: env.GOOGLE_GEMINI_TOKEN });

  const response = await ai.models.embedContent({
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
    },
    contents: [
      {
        inlineData: {
          data: bytes.toString("base64"),
          mimeType: mime,
        },
      },
    ],
    model: EMBEDDING_MODEL_VERSION,
  });

  const parsed = EmbedResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Gemini embedding response schema mismatch");
  }
  const embedding = parsed.data.embeddings[0].values;
  const norm = computeNorm(embedding);
  if (norm < 1e-6) {
    throw new Error("Degenerate (near-zero) embedding from Gemini");
  }

  return { embedding, norm };
};
