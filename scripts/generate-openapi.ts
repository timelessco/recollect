import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";

import * as endpoints from "../src/lib/openapi/endpoints";
import { registry } from "../src/lib/openapi/registry";
import * as sharedSchemas from "../src/lib/openapi/schemas/shared";

const tagDescriptions: Array<{ name: string; description: string }> = [
	{
		name: "Bookmarks",
		description:
			"Bookmark management: CRUD, trash, discover, and tag/category assignment",
	},
	{
		name: "Categories",
		description:
			"Collection management: create, update, and delete collections",
	},
	{
		name: "Instagram",
		description: "Instagram bookmark sync: import and monitor import status",
	},
	{
		name: "Raindrop",
		description: "Raindrop.io bookmark import: queue and monitor import status",
	},
	{
		name: "Twitter",
		description:
			"Twitter/X bookmark sync: import folders and monitor import status",
	},
	{
		name: "Profiles",
		description: "User profile management: preferred OG domain settings",
	},
	{
		name: "iPhone",
		description: "iOS share extension error reporting",
	},
];

const errorResponseSchema = {
	type: "object" as const,
	properties: {
		data: { type: "null" as const },
		error: { type: "string" as const },
	},
	required: ["data", "error"],
};

registry.registerComponent("responses", "Unauthorized", {
	description: "Not authenticated. Provide a valid bearer token.",
	content: {
		"application/json": {
			schema: errorResponseSchema,
			example: { data: null, error: "Not authenticated" },
		},
	},
});

registry.registerComponent("responses", "InternalError", {
	description: "Server error. The request could not be processed.",
	content: {
		"application/json": {
			schema: errorResponseSchema,
			example: { data: null, error: "Failed to process request" },
		},
	},
});

for (const register of Object.values(endpoints)) {
	register();
}

const generator = new OpenApiGeneratorV31(registry.definitions);

const document = generator.generateDocument({
	openapi: "3.1.0",
	info: {
		title: "Recollect API",
		version: "1.0.0",
		description:
			"Recollect API for bookmark management, organization, and import. Designed for mobile and frontend developers. Authenticate with a Supabase JWT bearer token.",
	},
	tags: tagDescriptions,
	servers: [{ url: "/api" }],
});

const outputPath = resolve(import.meta.dirname, "../public/openapi.json");
writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf8");

const sharedSchemaExports = Object.keys(sharedSchemas).length;
console.log(
	`OpenAPI spec written to public/openapi.json (${sharedSchemaExports} shared schema exports registered)`,
);
