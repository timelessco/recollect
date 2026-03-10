import { NextResponse, type NextRequest } from "next/server";

import { GetMediaTypeInputSchema, GetMediaTypeOutputSchema } from "./schema";
import { createGetApiHandler } from "@/lib/api-helpers/create-handler";

const ROUTE = "v2-bookmarks-get-media-type";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
} as const;

const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

const baseGet = createGetApiHandler({
	route: ROUTE,
	inputSchema: GetMediaTypeInputSchema,
	outputSchema: GetMediaTypeOutputSchema,
	handler: async ({ input }) => {
		try {
			const response = await fetch(input.url, {
				method: "HEAD",
				signal: AbortSignal.timeout(5_000),
				headers: { "User-Agent": USER_AGENT },
			});

			if (!response.ok) {
				return NextResponse.json(
					{
						data: {
							success: false,
							mediaType: null,
							error: "Failed to check media type",
						},
						error: null,
					},
					{ headers: CORS_HEADERS },
				);
			}

			const mediaType = response.headers.get("content-type");

			return NextResponse.json(
				{
					data: { success: true, mediaType, error: null },
					error: null,
				},
				{ headers: CORS_HEADERS },
			);
		} catch {
			return NextResponse.json(
				{
					data: {
						success: false,
						mediaType: null,
						error: "Failed to check media type",
					},
					error: null,
				},
				{ headers: CORS_HEADERS },
			);
		}
	},
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
	return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
