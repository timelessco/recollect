import type { PdfThumbnailOutput } from "./schema";

import { env } from "@/env/server";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { vet } from "@/utils/try";

import { PdfThumbnailInputSchema, PdfThumbnailOutputSchema } from "./schema";

const ROUTE = "pdf-thumbnail";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, user }) => {
    const [sanitizedUrl] = data.url.split("?");

    console.log(`[${route}] API called:`, {
      url: sanitizedUrl,
      userId: user.id,
    });

    const pdfApiUrl = env.PDF_URL_SCREENSHOT_API;
    const pdfApiKey = env.PDF_SECRET_KEY;

    if (!pdfApiUrl || !pdfApiKey) {
      return apiError({
        error: new Error("Missing PDF_URL_SCREENSHOT_API or PDF_SECRET_KEY"),
        message: "PDF Thumbnail service is not configured",
        operation: "pdf_thumbnail_config",
        route,
        userId: user.id,
      });
    }

    const [fetchError, response] = await vet(() =>
      fetch(pdfApiUrl, {
        body: JSON.stringify({ url: data.url, userId: user.id }),
        headers: {
          Authorization: `Bearer ${pdfApiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );

    if (fetchError) {
      return apiError({
        error: fetchError,
        extra: { url: sanitizedUrl },
        message: "PDF Thumbnail service is unreachable",
        operation: "pdf_thumbnail_network",
        route,
        userId: user.id,
      });
    }

    if (!response.ok) {
      return apiError({
        error: new Error(`PDF service responded with ${response.status}`),
        extra: { status: response.status, url: sanitizedUrl },
        message: "PDF Thumbnail service failed",
        operation: "pdf_thumbnail_fetch",
        route,
        userId: user.id,
      });
    }

    const raw: unknown = await response.json();
    const publicUrl =
      typeof raw === "object" && raw !== null && "publicUrl" in raw ? String(raw.publicUrl) : "";
    const sanitizedJsonData: PdfThumbnailOutput = { publicUrl };

    return sanitizedJsonData;
  },
  inputSchema: PdfThumbnailInputSchema,
  outputSchema: PdfThumbnailOutputSchema,
  route: ROUTE,
});
