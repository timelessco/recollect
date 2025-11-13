// Thanks to https://github.com/t3-oss/create-t3-app/

import { z } from "zod";

import { clientEnvironment, clientSchema } from "./schema.js";
import { formatErrors } from "./utils.js";

const parsedClientEnvironment = clientSchema.safeParse(clientEnvironment);

if (!parsedClientEnvironment.success) {
	console.error(
		"❌ Invalid environment variables:\n",
		...formatErrors(z.treeifyError(parsedClientEnvironment.error)),
	);

	throw new Error("Invalid environment variables");
}

for (const key of Object.keys(parsedClientEnvironment.data)) {
	if (!key.startsWith("NEXT_PUBLIC_")) {
		console.warn(
			`❌ Invalid public environment variable name: ${key}. It must begin with 'NEXT_PUBLIC_'`,
		);

		throw new Error("Invalid public environment variable name");
	}
}

export const clientEnvironmentParsedData = parsedClientEnvironment.data;
