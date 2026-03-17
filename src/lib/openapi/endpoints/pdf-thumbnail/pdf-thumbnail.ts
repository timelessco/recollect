/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const pdfThumbnailSupplement = {
	path: "/pdf-thumbnail",
	method: "post",
	tags: ["PDF"],
	summary: "Generate a thumbnail for a PDF URL",
	description:
		"Sends a PDF URL to an external screenshot service and returns the generated thumbnail's storage path and public URL. Used by the browser extension to generate preview images for bookmarked PDFs.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		url: "https://example.com/document.pdf",
	},
	responseExample: {
		data: {
			path: "pdf-thumbnails/abc123.png",
			publicUrl: "https://cdn.example.com/pdf-thumbnails/abc123.png",
		},
		error: null,
	},
	additionalResponses: {
		400: { description: "Invalid URL format" },
	},
} satisfies EndpointSupplement;
