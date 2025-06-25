/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "pdfjs-dist/build/pdf" {
	const pdfjsLibrary: any;
	export = pdfjsLibrary;
}

declare module "pdfjs-dist/build/pdf.worker.entry" {
	const worker: any;
	export default worker;
}
