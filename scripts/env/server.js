// Thanks to https://github.com/t3-oss/create-t3-app/

import { z } from "zod";

import { clientEnvironmentParsedData } from "./client.js";
import { serverEnvironment, serverSchema } from "./schema.js";
import { formatErrors } from "./utils.js";

const parsedServerEnvironment = serverSchema.safeParse(serverEnvironment);

if (!parsedServerEnvironment.success) {
	console.error(
		"❌ Invalid environment variables:\n",
		...formatErrors(z.treeifyError(parsedServerEnvironment.error)),
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
