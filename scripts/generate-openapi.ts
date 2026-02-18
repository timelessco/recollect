import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { registry } from "../src/lib/openapi/registry";
import { registerTagsAddTagToBookmark } from "../src/lib/openapi/endpoints/tags-add-tag-to-bookmark";

registerTagsAddTagToBookmark();

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
	openapi: "3.0.0",
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
