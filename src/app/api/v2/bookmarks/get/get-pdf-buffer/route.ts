import { NextResponse } from "next/server";

import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PDF_MIME_TYPE } from "@/utils/constants";

import { GetPdfBufferInputSchema, GetPdfBufferOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-get-pdf-buffer";

export const GET = createGetApiHandler({
  handler: async ({ input }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30_000);

    try {
      const result = await fetch(input.url, {
        signal: controller.signal,
      });

      if (!result.ok) {
        return apiError({
          error: new Error(`Upstream returned ${String(result.status)}`),
          message: "Failed to fetch PDF",
          operation: "get_pdf_buffer_fetch",
          route: ROUTE,
        });
      }

      const buffer = await result.arrayBuffer();

      return new NextResponse(buffer, {
        headers: { "Content-Type": PDF_MIME_TYPE },
      });
    } catch (error) {
      return apiError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: "Failed to fetch PDF",
        operation: "get_pdf_buffer_fetch",
        route: ROUTE,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  },
  inputSchema: GetPdfBufferInputSchema,
  outputSchema: GetPdfBufferOutputSchema,
  route: ROUTE,
});
