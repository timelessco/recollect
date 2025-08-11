import React from "react";
import dynamic from "next/dynamic";

// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const DummyPdf = dynamic(() => import("../components/dummy"), { ssr: false });

const DummyPdfViewer: React.FC = () => <DummyPdf />;

export default DummyPdfViewer;
