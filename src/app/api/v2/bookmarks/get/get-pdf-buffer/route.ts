import { type NextRequest } from "next/server";

import { GetPdfBufferInputSchema, GetPdfBufferOutputSchema } from "./schema";
import { type HandlerConfig } from "@/lib/api-helpers/create-handler";
import { PDF_MIME_TYPE } from "@/utils/constants";

const ROUTE = "v2-bookmarks-get-pdf-buffer";

async function handleGet(request: NextRequest) {
	const url = request.nextUrl.searchParams.get("url");

	if (!url) {
		return Response.json(
			{ data: null, error: "url query parameter is required" },
			{ status: 400 },
		);
	}

	const parseResult = GetPdfBufferInputSchema.safeParse({ url });
	if (!parseResult.success) {
		return Response.json(
			{
				data: null,
				error: parseResult.error.issues.at(0)?.message ?? "Invalid URL format",
			},
			{ status: 400 },
		);
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 30_000);

	try {
		const result = await fetch(parseResult.data.url, {
			signal: controller.signal,
		});

		if (!result.ok) {
			return Response.json(
				{ data: null, error: "Failed to fetch PDF" },
				{ status: 500 },
			);
		}

		const buffer = await result.arrayBuffer();

		return new Response(buffer, {
			headers: { "Content-Type": PDF_MIME_TYPE },
		});
	} catch {
		return Response.json(
			{ data: null, error: "Failed to fetch PDF" },
			{ status: 500 },
		);
	} finally {
		clearTimeout(timeoutId);
	}
}

export const GET = Object.assign(handleGet, {
	config: {
		factoryName: "createGetApiHandler",
		inputSchema: GetPdfBufferInputSchema,
		outputSchema: GetPdfBufferOutputSchema,
		route: ROUTE,
	} satisfies HandlerConfig,
});
