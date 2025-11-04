import { type NextApiResponse } from "next";
import { createCanvas } from "canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

import { type NextApiRequest } from "../../../../../types/apiTypes";
import {
	R2_MAIN_BUCKET_NAME,
	URL_PDF_CHECK_PATTERN,
} from "../../../../../utils/constants";
import { r2Helpers } from "../../../../../utils/r2Client";

pdfjsLib.GlobalWorkerOptions.workerSrc = "";

type PdfScreenshotRequest = {
	url: string;
};

type PdfScreenshotResponse = {
	publicUrl?: string;
	path?: string;
	success: boolean;
	error?: string;
};

export default async function handler(
	req: NextApiRequest<PdfScreenshotRequest>,
	res: NextApiResponse<PdfScreenshotResponse>,
) {
	if (req.method !== "POST") {
		return res
			.status(405)
			.json({ success: false, error: "Method Not Allowed" });
	}

	try {
		const { url } = req.body ?? {};

		if (!url || !URL_PDF_CHECK_PATTERN.test(url)) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid or missing PDF url" });
		}

		// Auth not required for this utility endpoint; using a test namespace for now

		// Fetch PDF bytes
		const pdfResponse = await fetch(url);
		if (!pdfResponse.ok) {
			return res
				.status(400)
				.json({ success: false, error: "Failed to fetch PDF from url" });
		}
		const arrayBuffer = await pdfResponse.arrayBuffer();
		const pdfData = new Uint8Array(arrayBuffer);

		// Render first page using pdfjs + node-canvas
		const loadingTask = pdfjsLib.getDocument({
			data: pdfData,
			disableAutoFetch: true,
			isEvalSupported: false,
		});
		const pdf = await loadingTask.promise;
		const firstPage = await pdf.getPage(1);
		const scale = 1.5;
		const viewport = firstPage.getViewport({ scale });

		const canvas = createCanvas(viewport.width, viewport.height);
		const context = canvas.getContext("2d");
		await firstPage.render({ canvasContext: context as any, viewport }).promise;

		const imageBuffer = canvas.toBuffer("image/png");

		// Derive a stable file name
		const decodedName = decodeURIComponent(
			url?.split("/").pop()?.split("?")[0]?.split("#")[0] ?? "file.pdf",
		);
		const baseName = decodedName.replace(/\.pdf$/iu, "");
		const thumbnailFileName = `thumb-${baseName}.png`;
		const key = `test/${thumbnailFileName}`;

		// Upload to R2 directly from server
		const { error: uploadError } = await r2Helpers.uploadObject(
			R2_MAIN_BUCKET_NAME,
			key,
			imageBuffer,
			"image/png",
		);

		if (uploadError) {
			return res
				.status(500)
				.json({ success: false, error: "Failed to upload thumbnail to R2" });
		}

		const { data } = r2Helpers.getPublicUrl(key);
		return res
			.status(200)
			.json({ success: true, path: key, publicUrl: data.publicUrl });
	} catch (error) {
		console.error("pdf-screenshot api error", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal Server Error" });
	}
}
