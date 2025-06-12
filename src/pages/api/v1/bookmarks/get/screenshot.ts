import fs from "node:fs";
import path from "node:path";
import { type NextApiRequest, type NextApiResponse } from "next";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import { z } from "zod";

import cfCheck from "../../../../../utils/cfCheck";
import {
	isDevelopment,
	localExecutablePath,
	remoteExecutablePath,
	userAgent,
} from "../../../../../utils/constants";

export const config = {
	api: {
		responseLimit: false,
		bodyParser: false,
	},
};

const querySchema = z.object({
	url: z.string().url(),
});
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	const result = querySchema.safeParse(request?.query);
	if (request.method !== "GET") {
		return NextResponse.json(
			{ error: "Only GET requests allowed" },
			{ status: 405 },
		);
	}

	if (!result.success) {
		response.status(400).json({ error: result.error.format() });
		return "";
	}

	const { searchParams } = new URL(
		request.url ?? "",
		process.env.NEXT_PUBLIC_VERCEL_URL,
	);
	const urlString = searchParams.get("url");
	if (!urlString) {
		return NextResponse.json(
			{ error: "Missing url parameter" },
			{ status: 400 },
		);
	}

	let browser = null;
	try {
		// eslint-disable-next-line import/no-named-as-default-member
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
			headless: true,
			debuggingPort: isDevelopment ? 9_222 : undefined,
		});

		const pages = await browser.pages();
		const page = pages[0];
		await page.setUserAgent(userAgent);
		await page.setViewport({ width: 1_920, height: 1_080 });

		const preloadFile = fs.readFileSync(
			path.join(process.cwd(), "src/utils/preload.ts"),
			"utf8",
		);
		await page.evaluateOnNewDocument(preloadFile);

		await page.goto(urlString, {
			waitUntil: "networkidle2",
			timeout: 60_000,
		});

		await cfCheck(page);

		const blob = await page.screenshot({ type: "png" });

		response.setHeader("Content-Type", "image/png");
		response.setHeader("Content-Length", blob.length.toString());
		response.status(200).end(blob);
		return "";
	} catch (error) {
		console.error("Error:", error);
		Sentry.captureException(`headless browser error: ${error}`);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	} finally {
		if (browser) await browser.close();
	}
}
