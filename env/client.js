// Thanks to https://github.com/t3-oss/create-t3-app/
import { clientEnvironment, clientSchema } from "./schema.js";
import { formatErrors } from "./utils.js";

const parsedClientEnvironment = clientSchema.safeParse(clientEnvironment);

if (!parsedClientEnvironment.success) {
	console.error(
		"❌ Invalid environment variables:\n",
		...formatErrors(parsedClientEnvironment.error.format()),
	);

	throw new Error("Invalid environment variables");
}

const regex = /^NEXT_PUBLIC_/u;

for (const key of Object.keys(parsedClientEnvironment.data)) {
	if (!regex.test(key)) {
		console.warn(
			`❌ Invalid public environment variable name: ${key}. It must begin with 'NEXT_PUBLIC_'`,
		);

		throw new Error("Invalid public environment variable name");
	}
}

export const clientEnvironmentParsedData = parsedClientEnvironment.data;
