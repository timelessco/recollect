import { PdfScreenshotInputSchema, PdfScreenshotOutputSchema } from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

const ROUTE = "pdf-screenshot";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: PdfScreenshotInputSchema,
	outputSchema: PdfScreenshotOutputSchema,
	handler: async ({ data, user, route }) => {
		const pdfApiUrl = process.env.PDF_URL_SCREENSHOT_API;
		const pdfApiKey = process.env.PDF_SECRET_KEY;

		if (!pdfApiUrl || !pdfApiKey) {
			return apiError({
				route,
				message: "PDF screenshot service is not configured",
				error: new Error("Missing PDF_URL_SCREENSHOT_API or PDF_SECRET_KEY"),
				operation: "pdf_screenshot_config",
				userId: user.id,
			});
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10_000);

		let response: Response;
		try {
			response = await fetch(pdfApiUrl, {
				body: JSON.stringify({ url: data.url, userId: user.id }),
				headers: {
					Authorization: `Bearer ${pdfApiKey}`,
					"Content-Type": "application/json",
				},
				method: "POST",
				signal: controller.signal,
			});
		} catch (error) {
			clearTimeout(timeout);
			const isTimeout =
				error instanceof DOMException && error.name === "AbortError";
			return apiError({
				route,
				message: isTimeout
					? "PDF screenshot service timed out"
					: "PDF screenshot service is unreachable",
				error: error instanceof Error ? error : new Error(String(error)),
				operation: isTimeout
					? "pdf_screenshot_timeout"
					: "pdf_screenshot_network",
				userId: user.id,
				extra: { url: data.url },
			});
		}

		clearTimeout(timeout);

		if (!response.ok) {
			return apiError({
				route,
				message: "PDF screenshot service failed",
				error: new Error(`PDF service responded with ${response.status}`),
				operation: "pdf_screenshot_fetch",
				userId: user.id,
				extra: { url: data.url, status: response.status },
			});
		}

		return (await response.json()) as {
			path: string;
			publicUrl: string;
		};
	},
});
