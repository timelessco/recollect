import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import * as Sentry from "@sentry/nextjs";

import { createGetApiHandler } from "@/lib/api-helpers/create-handler";

import { GetMediaTypeInputSchema, GetMediaTypeOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-get-media-type";

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
} as const;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

const baseGet = createGetApiHandler({
  handler: async ({ input }) => {
    try {
      const response = await fetch(input.url, {
        headers: { "User-Agent": USER_AGENT },
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        Sentry.captureMessage("get-media-type: upstream returned non-OK", {
          extra: { status: response.status, url: input.url },
          level: "warning",
          tags: { operation: "get_media_type_fetch", route: ROUTE },
        });
        return NextResponse.json(
          {
            data: {
              error: "Failed to check media type",
              mediaType: null,
              success: false,
            },
            error: null,
          },
          { headers: CORS_HEADERS },
        );
      }

      const mediaType = response.headers.get("content-type");

      return NextResponse.json(
        {
          data: { error: null, mediaType, success: true },
          error: null,
        },
        { headers: CORS_HEADERS },
      );
    } catch (error) {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { operation: "get_media_type_fetch", route: ROUTE },
      });
      return NextResponse.json(
        {
          data: {
            error: "Failed to check media type",
            mediaType: null,
            success: false,
          },
          error: null,
        },
        { headers: CORS_HEADERS },
      );
    }
  },
  inputSchema: GetMediaTypeInputSchema,
  outputSchema: GetMediaTypeOutputSchema,
  route: ROUTE,
});

export const GET = Object.assign(
  async (request: NextRequest) => {
    const response = await baseGet(request);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, value);
    }

    return response;
  },
  { config: baseGet.config },
);

export function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS, status: 204 });
}
