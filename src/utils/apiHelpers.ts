import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

import {
	getBaseUrl,
	NEXT_API_URL,
	STORAGE_FILES_PATH,
	UPLOAD_FILE_REMAINING_DATA_API,
} from "./constants";
import { r2Helpers } from "./r2Client";
import { errorToast } from "./toastMessages";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// This file has front end api related helpers

const defaultErrorText = "Something went wrong";

const errorTextLogic = (error: unknown) =>
	typeof error === "string" ? error : defaultErrorText;

// the apiCall param should have mutateAsync
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mutationApiCall = async (apiCall: Promise<any>) => {
	const response = await apiCall;

	if (response?.response?.status !== 200 && response?.response?.data?.error) {
		errorToast(errorTextLogic(response?.response?.data?.error));
	}

	return response;
};

// eslint-disable-next-line func-style
export async function generatePdfThumbnail(file: string): Promise<Blob | null> {
	const response = await fetch(
		`${getBaseUrl()}${NEXT_API_URL}/file/get-pdf-buffer`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ url: file }),
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
		if (!context) return null;

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

		const fileName = fileUrl?.split("/")[fileUrl?.split("/").length - 1];

		const thumbnailFileName = `thumb-${fileName?.replace(".pdf", ".jpg")}`;

		const { data: thumbUploadUrl, error: thumbError } =
			await r2Helpers.createSignedUploadUrl(
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

		const publicUrl = `${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL}/${STORAGE_FILES_PATH}/${sessionUserId}/${thumbnailFileName}`;

		try {
			await axios.post(
				`${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_REMAINING_DATA_API}`,
				{
					id: fileId,
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
