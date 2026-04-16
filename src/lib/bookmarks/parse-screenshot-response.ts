/**
 * Shared parser for the `vercel-puppeteer-screenshot-api` response body.
 *
 * The service returns the JPEG as Node's serialized Buffer shape
 * (`{ type: "Buffer", data: number[] }`) — `JSON.stringify(buffer)` produces this.
 * v1 worked because it called `Buffer.from(numberArray)` directly. v2's first
 * port used a `typeof === "string"` guard that silently dropped the array and
 * uploaded 0 bytes, which broke downstream blurhash + Gemini image analysis for
 * every queue-worker-driven screenshot. This module is the single source of
 * truth for both the manual path (`/api/v2/bookmark/add-url-screenshot`) and
 * the queue-worker path (`/api/v2/screenshot`).
 */

/* oxlint-disable @typescript-eslint/no-unsafe-type-assertion -- external API type boundary with runtime guards */

export interface ParsedScreenshotResponse {
  allImages: string[] | undefined;
  allVideos: string[] | undefined;
  metaData: {
    description: string | undefined;
    isPageScreenshot: boolean | undefined;
    title: string | undefined;
  };
  screenshotBuffer: Buffer;
}

/**
 * Converts the `screenshot.data` field from the upstream response into a Buffer.
 * Handles both the modern `number[]` (Node Buffer JSON) shape and the legacy
 * base64-string shape. Returns a zero-length Buffer on any other value so
 * callers can detect and reject empty payloads uniformly.
 */
export function extractScreenshotBuffer(data: unknown): Buffer {
  if (Array.isArray(data)) {
    return Buffer.from(data as number[]);
  }
  if (typeof data === "string") {
    return Buffer.from(data, "base64");
  }
  return Buffer.alloc(0);
}

export function parseScreenshotResponse(json: unknown): ParsedScreenshotResponse {
  const obj = json !== null && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const metaData =
    obj.metaData !== null && typeof obj.metaData === "object"
      ? (obj.metaData as Record<string, unknown>)
      : {};
  const screenshot =
    obj.screenshot !== null && typeof obj.screenshot === "object"
      ? (obj.screenshot as Record<string, unknown>)
      : {};

  return {
    allImages: Array.isArray(obj.allImages) ? (obj.allImages as string[]) : undefined,
    allVideos: Array.isArray(obj.allVideos) ? (obj.allVideos as string[]) : undefined,
    metaData: {
      description: typeof metaData.description === "string" ? metaData.description : undefined,
      isPageScreenshot:
        typeof metaData.isPageScreenshot === "boolean" ? metaData.isPageScreenshot : undefined,
      title: typeof metaData.title === "string" ? metaData.title : undefined,
    },
    screenshotBuffer: extractScreenshotBuffer(screenshot.data),
  };
}

/* oxlint-enable @typescript-eslint/no-unsafe-type-assertion */
