"use client";

import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type Props = {
	className?: string;
	pdfUrl: string;
};

const PDFThumbnail = ({ pdfUrl, className }: Props) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const renderThumbnail = async () => {
			const loadingTask = pdfjsLib.getDocument(pdfUrl);
			const pdf = await loadingTask.promise;
			const page = await pdf.getPage(1);

			const scale = 1.5;
			const viewport = page.getViewport({ scale });

			const canvas = canvasRef.current;
			if (!canvas) return;

			const context = canvas.getContext("2d");
			if (!context) return;
			canvas.height = viewport.height;
			canvas.width = viewport.width;

			const renderContext = {
				canvasContext: context,
				viewport,
			};

			await page.render(renderContext).promise;
		};

		void renderThumbnail();
	}, [pdfUrl]);

	return <canvas className={className} ref={canvasRef} />;
};

export default PDFThumbnail;
