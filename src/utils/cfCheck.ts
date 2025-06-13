/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Cloudflare Check Tools:
 * https://nopecha.com/demo/cloudflare
 * https://nowsecure.nl/
 * https://2captcha.com/demo/cloudflare-turnstile
 *
 * Browser Check Tools:
 * https://infosimples.github.io/detect-headless/
 * https://arh.antoinevastel.com/bots/areyouheadless
 * https://bot.sannysoft.com/
 * https://hmaker.github.io/selenium-detector/
 * https://kaliiiiiiiiii.github.io/brotector/
 */

/**
 * Waits for and checks Cloudflare's challenge widget within page frames.
 * Specifically looks for the Turnstile challenge and waits until it is solved.
 * Logs challenge widget ID and result value once completed.
 */

const cfCheck = async function (page: any) {
	await page.waitForFunction("window._cf_chl_opt===undefined");
	const frames = await page.frames();

	for (const frame of frames) {
		const frameUrl = frame.url();

		try {
			const domain = new URL(frameUrl).hostname;
			console.error(domain);

			if (domain === "challenges.cloudflare.com") {
				const id = await frame.evaluate(
					() =>
						// Tell TS this property exists on window
						(window as any)?._cf_chl_opt?.chlApiWidgetId,
				);

				await page.waitForFunction(
					`(document.getElementById("cf-chl-widget-${id}_response") as HTMLInputElement)?.value !== ''`,
				);

				const result = await page.evaluate((widgetId: any) => {
					const element = document?.getElementById(
						`cf-chl-widget-${widgetId}_response`,
					) as HTMLInputElement | null;

					return element?.value ?? null;
				}, id);

				console.error(result);
				console.error("CF is loaded.");
			}
		} catch (error) {
			console.error(error);
			return;
		}
	}
};

export default cfCheck;
