import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

import {
	GET_PDF_BUFFER_API,
	getBaseUrl,
	NEXT_API_URL,
	PDF_MIME_TYPE,
	STORAGE_FILES_PATH,
	UPLOAD_FILE_REMAINING_DATA_API,
} from "./constants";
import { getStoragePublicBaseUrl, storageHelpers } from "./storageClient";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function generatePdfThumbnail(file: string): Promise<Blob | null> {
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

		const canvas = document?.createElement("canvas");
		canvas.width = viewport?.width;
		canvas.height = viewport?.height;
		const context = canvas?.getContext("2d");
		if (!context) {
			return null;
		}

		await page?.render({ canvasContext: context, viewport })?.promise;

		return await new Promise((resolve) => {
			canvas?.toBlob((blob) => {
				resolve(blob);
			}, "image/jpg");
		});
	} catch (error) {
		console.error("Thumbnail generation error", error);
		throw new Error("No thumbnail generated.");
	}
}

export const handlePdfThumbnailAndUpload = async ({
	fileUrl,
	fileId,
	sessionUserId,
}: {
	fileId: number;
	fileUrl: string;
	sessionUserId: string | undefined;
}): Promise<void> => {
	try {
		const thumbnailBlob = await generatePdfThumbnail(fileUrl);

		if (!thumbnailBlob) {
			console.warn("No thumbnail generated.");
			throw new Error("No thumbnail generated.");
		}

		const fileNameWithExtension = decodeURIComponent(
			fileUrl?.split("/").pop()?.split("?")[0]?.split("#")[0] ?? "",
		);

		const fileName = fileNameWithExtension?.replace(/\.pdf$/iu, "");
		const thumbnailFileName = `thumb-${fileName}.jpg`;

		const { data: thumbUploadUrl, error: thumbError } =
			await storageHelpers.createSignedUploadUrl(
				"recollect",
				`${STORAGE_FILES_PATH}/${sessionUserId}/${thumbnailFileName}`,
			);

		if (!thumbUploadUrl?.signedUrl || thumbError) {
			console.error("Failed to get signed URL for thumbnail upload.");
			throw new Error("Failed to get signed URL for thumbnail upload.");
		}

		const uploadResponse = await fetch(thumbUploadUrl?.signedUrl, {
			method: "PUT",
			body: thumbnailBlob,
			headers: {
				"Content-Type": "image/png",
			},
		});

		if (!uploadResponse.ok) {
			const message = await uploadResponse.text();
			console.error("Thumbnail upload failed:", message);
			throw new Error("Thumbnail upload failed: " + message);
		}

		const publicUrl = `${getStoragePublicBaseUrl()}/${STORAGE_FILES_PATH}/${sessionUserId}/${thumbnailFileName}`;

		try {
			await axios.post(
				`${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_REMAINING_DATA_API}`,
				{
					id: fileId,
					mediaType: PDF_MIME_TYPE,
					publicUrl,
				},
			);
		} catch (error) {
			console.error("Error in uploading file remaining data");
			throw error;
		}
	} catch (error) {
		console.error("Error in handlePdfThumbnailAndUpload:", error);
		throw error;
	}
};
