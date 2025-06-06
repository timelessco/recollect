import fs from "node:fs";
import path from "node:path";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

import cfCheck from "../../utils/cfCheck";
import {
	isDev as isDevelopment,
	localExecutablePath,
	remoteExecutablePath,
	userAgent,
} from "../../utils/utils";

export const config = {
	api: {
		responseLimit: false,
		bodyParser: false,
	},
};

export default async function handler(request, res) {
	const urlString = request.query.url;
	if (!urlString) {
		res.status(400).json({ error: "Missing url parameter" });
		return;
	}

	let browser = null;
	try {
		browser = await puppeteer.launch({
			ignoreDefaultArgs: ["--enable-automation"],
			args: isDevelopment
				? [
						"--disable-blink-features=AutomationControlled",
						"--disable-features=site-per-process",
						"-disable-site-isolation-trials",
				  ]
				: [...chromium.args, "--disable-blink-features=AutomationControlled"],
			defaultViewport: { width: 1_920, height: 1_080 },
			executablePath: isDevelopment
				? localExecutablePath
				: await chromium.executablePath(remoteExecutablePath),
			// isDevelopment ? false : "new",
			// when its new then its headless
			headless: "new",
			debuggingPort: isDevelopment ? 9_222 : undefined,
		});

		const pages = await browser.pages();
		const page = pages[0];
		await page.setUserAgent(userAgent);
		await page.setViewport({ width: 1_920, height: 1_080 });

		const preloadFile = fs.readFileSync(
			path.join(process.cwd(), "src/utils/preload.js"),
			"utf8",
		);
		await page.evaluateOnNewDocument(preloadFile);

		await page.goto(urlString, {
			waitUntil: "networkidle2",
			timeout: 60_000,
		});

		await cfCheck(page);

		const blob = await page.screenshot({ type: "png" });

		res.setHeader("Content-Type", "image/png");
		res.setHeader("Content-Length", blob.length.toString());
		res.status(200).end(blob);
		return;
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ error: "Internal Server Error" });
		return;
	} finally {
		if (browser) await browser.close();
	}
}
