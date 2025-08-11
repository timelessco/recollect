import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { pdfjs } from "react-pdf";

const PDFDocument = dynamic(
	() => import("react-pdf").then((module_) => module_.Document),
	{ ssr: false },
);
const PDFPage = dynamic(
	() => import("react-pdf").then((module_) => module_.Page),
	{ ssr: false },
);
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
export const DummyPdfViewer: React.FC = () => {
	const [numberPages, setNumberPages] = useState<number | null>(null);

	const samplePdfUrl = "https://arxiv.org/pdf/quant-ph/0410100.pdf";

	const onDocumentLoadSuccess = useCallback(
		({ numPages }: { numPages: number }) => {
			setNumberPages(numPages);
		},
		[],
	);

	return (
		<div className="relative flex h-full w-full items-center justify-center">
			<div className="h-full w-full overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<PDFDocument
					className="flex flex-col items-center"
					error={
						<div className="p-4 text-center text-red-500">
							Failed to load PDF.&nbsp;
							<a
								className="text-blue-600 underline"
								href={samplePdfUrl}
								rel="noopener noreferrer"
								target="_blank"
							>
								Download PDF
							</a>
						</div>
					}
					file={samplePdfUrl}
					loading={
						<div className="p-4 text-center text-gray-500">Loading PDF...</div>
					}
					onLoadSuccess={onDocumentLoadSuccess}
				>
					<div>
						<PDFPage
							pageNumber={1}
							renderAnnotationLayer={false}
							renderTextLayer
							width={1_200}
						/>
					</div>
				</PDFDocument>
			</div>
		</div>
	);
};

export default DummyPdfViewer;
