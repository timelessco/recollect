// utils/pdfThumbnail.ts

import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// eslint-disable-next-line func-style
export async function generatePdfThumbnail(file: string): Promise<Blob | null> {
	const response = await fetch(file);
	const arrayBuffer = await response?.arrayBuffer();

	try {
		const pdf = await pdfjsLib?.getDocument({ data: arrayBuffer })?.promise;
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
		return null;
	}
}
