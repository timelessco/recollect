import { NextResponse } from "next/server";

import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
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
        return NextResponse.json({ data: null, error: "Failed to fetch PDF" }, { status: 500 });
      }

      const buffer = await result.arrayBuffer();

      return new NextResponse(buffer, {
        headers: { "Content-Type": PDF_MIME_TYPE },
      });
    } catch {
      return NextResponse.json({ data: null, error: "Failed to fetch PDF" }, { status: 500 });
    } finally {
      clearTimeout(timeoutId);
    }
  },
  inputSchema: GetPdfBufferInputSchema,
  outputSchema: GetPdfBufferOutputSchema,
  route: ROUTE,
});
