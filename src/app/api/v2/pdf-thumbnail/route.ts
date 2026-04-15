import type { PdfThumbnailOutput } from "./schema";

import { env } from "@/env/server";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";

import { PdfThumbnailInputSchema, PdfThumbnailOutputSchema } from "./schema";

const ROUTE = "v2-pdf-thumbnail";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, user }) => {
      const [sanitizedUrl] = data.url.split("?");

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.pdf_url = sanitizedUrl;
      }

      const pdfApiUrl = env.PDF_URL_SCREENSHOT_API;
      const pdfApiKey = env.PDF_SECRET_KEY;

      if (!pdfApiUrl || !pdfApiKey) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("Missing PDF_URL_SCREENSHOT_API or PDF_SECRET_KEY"),
          message: "PDF Thumbnail service is not configured",
          operation: "pdf_thumbnail_config",
        });
      }

      let response: Response;
      try {
        response = await fetch(pdfApiUrl, {
          body: JSON.stringify({ url: data.url, userId: user.id }),
          headers: {
            Authorization: `Bearer ${pdfApiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });
      } catch (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error instanceof Error ? error : new Error(String(error)),
          context: { url: sanitizedUrl },
          message: "PDF Thumbnail service is unreachable",
          operation: "pdf_thumbnail_network",
        });
      }

      if (!response.ok) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error(`PDF service responded with ${String(response.status)}`),
          context: { status: response.status, url: sanitizedUrl },
          message: "PDF Thumbnail service failed",
          operation: "pdf_thumbnail_fetch",
        });
      }

      const raw: unknown = await response.json();
      const publicUrl =
        typeof raw === "object" && raw !== null && "publicUrl" in raw ? String(raw.publicUrl) : "";

      if (ctx?.fields) {
        ctx.fields.thumbnail_generated = publicUrl.length > 0;
      }

      const result: PdfThumbnailOutput = { publicUrl };
      return result;
    },
    inputSchema: PdfThumbnailInputSchema,
    outputSchema: PdfThumbnailOutputSchema,
    route: ROUTE,
  }),
);
