import { NextResponse } from "next/server";

import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext } from "@/lib/api-helpers/server-context";

import { GetMediaTypeInputSchema, GetMediaTypeOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-get-media-type";

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
} as const;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const { url } = input;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.target_url = url;
      }

      // D-05 exception: handler-level catch preserves CORS headers on error responses.
      // Throwing RecollectApiError would reach the factory catch, which returns JSON
      // without CORS headers — breaking cross-origin error handling for browser callers.
      // Observability is maintained via ctx.fields (error_type, upstream_status, fetch_error).
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          if (ctx?.fields) {
            ctx.fields.error_type = "upstream_error";
            ctx.fields.upstream_status = response.status;
          }
          return NextResponse.json(
            { error: "Failed to check media type", mediaType: null, success: false },
            { headers: CORS_HEADERS },
          );
        }

        const mediaType = response.headers.get("content-type");

        return NextResponse.json(
          { error: null, mediaType, success: true },
          { headers: CORS_HEADERS },
        );
      } catch (error) {
        if (ctx?.fields) {
          ctx.fields.error_type = "fetch_exception";
          ctx.fields.fetch_error = error instanceof Error ? error.message : String(error);
        }
        return NextResponse.json(
          { error: "Failed to check media type", mediaType: null, success: false },
          { headers: CORS_HEADERS },
        );
      }
    },
    inputSchema: GetMediaTypeInputSchema,
    outputSchema: GetMediaTypeOutputSchema,
    route: ROUTE,
  }),
);

export function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS, status: 204 });
}
