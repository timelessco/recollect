export default async function handler(request, response) {
	const { url: pdfUrl } = request.body;

	try {
		const result = await fetch(pdfUrl);
		const buffer = await result.arrayBuffer();

		response.setHeader("Content-Type", "application/pdf");
		response.send(Buffer.from(buffer));
	} catch {
		response.status(500).json({ error: "Failed to fetch PDF" });
	}
}
