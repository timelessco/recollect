import { type NextApiRequest, type NextApiResponse } from "next";
import { createCanvas } from "canvas";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

import user from "../../../../../../icons/toastIcons/user";
import {
	GET_PDF_BUFFER_API,
	getBaseUrl,
	NEXT_API_URL,
	STORAGE_FILES_PATH,
} from "../../../../../../utils/constants";
import { r2Helpers } from "../../../../../../utils/r2Client";
import { apiSupabaseClient } from "../../../../../../utils/supabaseServerClient";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const generatePdfThumbnail = async (file: string): Promise<Buffer | null> => {
	const encodedUrl = encodeURIComponent(file);

	const response = await fetch(
		`${getBaseUrl()}${NEXT_API_URL}${GET_PDF_BUFFER_API}?url=${encodedUrl}`,
		{
			method: "GET",
		},
	);

	if (!response?.ok) {
		throw new Error("error in arrayBuffer");
	}

	const arrayBuffer = await response?.arrayBuffer();

	try {
		const pdf = await pdfjsLib?.getDocument({
			data: arrayBuffer,
			disableAutoFetch: true,
		})?.promise;

		const page = await pdf?.getPage(1);
		const scale = 1.5;
		const viewport = page?.getViewport({ scale });

		const canvas = createCanvas(viewport?.width, viewport?.height);
		const context = canvas.getContext("2d");
		if (!context) return null;

		await page?.render({ canvasContext: context, viewport })?.promise;

		// Convert canvas to buffer
		return canvas.toBuffer("image/jpeg");
	} catch (error) {
		console.error("Thumbnail generation error", error);
		throw new Error("No thumbnail generated.");
	}
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	try {
		const { fileUrl } = request.body;
		if (!fileUrl) {
			response.status(400).json({ error: "fileUrl is required" });
			return;
		}

		const thumbnailBuffer = await generatePdfThumbnail(fileUrl);

		if (!thumbnailBuffer) {
			response.status(400).json({ error: "No thumbnail generated" });
			return;
		}

		const fileNameWithExtension = decodeURIComponent(
			fileUrl?.split("/").pop()?.split("?")[0]?.split("#")[0] ?? "",
		);

		// Using simple regex without flags since we're targeting ES5
		const fileName = fileNameWithExtension.replace(/\.pdf$/, "");
		const thumbnailFileName = `thumb-${fileName}.jpg`;

		const { data: thumbUploadUrl, error: thumbError } =
			await r2Helpers.createSignedUploadUrl(
				"recollect",
				`${STORAGE_FILES_PATH}/test/${thumbnailFileName}`,
			);

		if (!thumbUploadUrl?.signedUrl || thumbError) {
			console.error("Failed to get signed URL for thumbnail upload.");
			response
				.status(500)
				.json({ error: "Failed to get signed URL for thumbnail upload" });
			return;
		}

		const uploadResponse = await fetch(thumbUploadUrl?.signedUrl, {
			method: "PUT",
			body: thumbnailBuffer,
			headers: {
				"Content-Type": "image/jpeg",
			},
		});

		if (!uploadResponse.ok) {
			const message = await uploadResponse.text();
			console.error("Thumbnail upload failed:", message);
			response
				.status(500)
				.json({ error: `Thumbnail upload failed: ${message}` });
			return;
		}

		const publicUrl = `${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL}/${STORAGE_FILES_PATH}/test/${thumbnailFileName}`;

		response.status(200).json({ publicUrl });
		return;
	} catch (error) {
		console.error("Error in PDF to image conversion:", error);
		response.status(500).json({ error: "Internal server error" });
	}
}
