import { NextResponse } from "next/server";

import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { PDF_MIME_TYPE } from "@/utils/constants";

import { GetPdfBufferInputSchema, GetPdfBufferOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-get-pdf-buffer";

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.pdf_url = input.url;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30_000);

      try {
        const result = await fetch(input.url, {
          signal: controller.signal,
        });

        if (!result.ok) {
          throw new RecollectApiError("service_unavailable", {
            cause: new Error(`Upstream returned ${String(result.status)}`),
            message: "Failed to fetch PDF",
            operation: "get_pdf_buffer_fetch",
          });
        }

        const buffer = await result.arrayBuffer();

        // Outcome flags AFTER the fetch
        if (ctx?.fields) {
          ctx.fields.pdf_fetched = true;
          ctx.fields.content_type = result.headers.get("content-type");
          ctx.fields.pdf_size_bytes = buffer.byteLength;
        }

        return new NextResponse(buffer, {
          headers: { "Content-Type": PDF_MIME_TYPE },
        });
      } catch (error) {
        if (error instanceof RecollectApiError) {
          throw error;
        }
        throw new RecollectApiError("service_unavailable", {
          cause: error instanceof Error ? error : new Error(String(error)),
          message: "Failed to fetch PDF",
          operation: "get_pdf_buffer_fetch",
        });
      } finally {
        clearTimeout(timeoutId);
      }
    },
    inputSchema: GetPdfBufferInputSchema,
    outputSchema: GetPdfBufferOutputSchema,
    route: ROUTE,
  }),
);
