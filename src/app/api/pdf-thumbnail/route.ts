import { PdfScreenshotInputSchema, PdfScreenshotOutputSchema } from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { vet } from "@/utils/try";

const ROUTE = "pdf-thumbnail";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: PdfScreenshotInputSchema,
	outputSchema: PdfScreenshotOutputSchema,
	handler: async ({ data, user, route }) => {
		const sanitizedUrl = data.url.split("?")[0];

		console.log(`[${route}] API called:`, {
			userId: user.id,
			url: sanitizedUrl,
		});

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

		const [fetchError, response] = await vet(() =>
			fetch(pdfApiUrl, {
				body: JSON.stringify({ url: data.url, userId: user.id }),
				headers: {
					Authorization: `Bearer ${pdfApiKey}`,
					"Content-Type": "application/json",
				},
				method: "POST",
			}),
		);

		if (fetchError) {
			return apiError({
				route,
				message: "PDF screenshot service is unreachable",
				error: fetchError,
				operation: "pdf_screenshot_network",
				userId: user.id,
				extra: { url: sanitizedUrl },
			});
		}

		if (!response.ok) {
			return apiError({
				route,
				message: "PDF screenshot service failed",
				error: new Error(`PDF service responded with ${response.status}`),
				operation: "pdf_screenshot_fetch",
				userId: user.id,
				extra: { url: sanitizedUrl, status: response.status },
			});
		}

		return (await response.json()) as {
			path: string;
			publicUrl: string;
		};
	},
});
