import { NextResponse } from "next/server";

import ky from "ky";

import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { PDF_MIME_TYPE } from "@/utils/constants";

import { GetPdfBufferInputSchema, GetPdfBufferOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-get-pdf-buffer";

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const ctx = getServerContext();
      setPayload(ctx, { pdf_url: input.url });

      try {
        const result = await ky.get(input.url, { retry: 0, timeout: 30_000 });

        const buffer = await result.arrayBuffer();

        // Outcome flags AFTER the fetch
        setPayload(ctx, {
          pdf_fetched: true,
          content_type: result.headers.get("content-type"),
          pdf_size_bytes: buffer.byteLength,
        });

        return new NextResponse(buffer, {
          headers: { "Content-Type": PDF_MIME_TYPE },
        });
      } catch (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error instanceof Error ? error : new Error(String(error)),
          message: "Failed to fetch PDF",
          operation: "get_pdf_buffer_fetch",
        });
      }
    },
    inputSchema: GetPdfBufferInputSchema,
    outputSchema: GetPdfBufferOutputSchema,
    route: ROUTE,
  }),
);
