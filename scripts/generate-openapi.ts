import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { registry } from "../src/lib/openapi/registry";
import * as endpoints from "../src/lib/openapi/endpoints";

for (const register of Object.values(endpoints)) {
	register();
}

const generator = new OpenApiGeneratorV31(registry.definitions);

const document = generator.generateDocument({
	openapi: "3.1.0",
	info: {
		title: "Recollect API",
		version: "1.0.0",
		description: "Internal API documentation for Recollect",
	},
	servers: [{ url: "/api" }],
});

const outputPath = resolve(import.meta.dirname, "../public/openapi.json");
writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf8");

console.log("OpenAPI spec written to public/openapi.json");
