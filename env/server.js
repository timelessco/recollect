// Thanks to https://github.com/t3-oss/create-t3-app/
// @ts-check
/**
 * This file is included in `/next.config.js` which ensures the app isn't built with invalid env vars.
 * It has to be a `.js`-file to be imported there.
 */

import { clientEnvironmentParsedData } from "./client.js";
import { serverEnvironment, serverSchema } from "./schema.js";
import { formatErrors } from "./utils.js";

const parsedServerEnvironment = serverSchema.safeParse(serverEnvironment);

if (!parsedServerEnvironment.success) {
	console.error(
		"❌ Invalid environment variables:\n",
		...formatErrors(parsedServerEnvironment.error.format()),
	);
	throw new Error("Invalid environment variables");
}

for (const key of Object.keys(parsedServerEnvironment.data)) {
	if (key.startsWith("NEXT_PUBLIC_")) {
		console.warn("❌ You are exposing a server-side env-variable:", key);

		throw new Error("You are exposing a server-side env-variable");
	}
}

export const environment = {
	...parsedServerEnvironment.data,
	...clientEnvironmentParsedData,
};
