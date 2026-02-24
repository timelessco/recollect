import { globSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { type HandlerConfig } from "../src/lib/api-helpers/create-handler";
import { bearerAuth, registry } from "../src/lib/openapi/registry";
import * as sharedSchemas from "../src/lib/openapi/schemas/shared";
import { apiResponseSchema } from "../src/lib/openapi/schemas/envelope";
import {
	collectSupplements,
	mergeSupplements,
} from "./merge-openapi-supplements";

const ROOT = resolve(import.meta.dirname, "..");
const API_DIR = resolve(ROOT, "src/app/api");

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

registry.registerComponent("responses", "ValidationError", {
	description: "Validation error. The request body or parameters are invalid.",
	content: {
		"application/json": {
			schema: errorResponseSchema,
			example: { data: null, error: "Invalid request parameters" },
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

// Paths to skip — not part of the public API spec
const SKIP_PATHS = new Set(["cron", "dev"]);

function getApiPath(routeFilePath: string): string {
	const rel = relative(API_DIR, routeFilePath);
	return `/${rel.replace(/\/route\.ts$/u, "")}`;
}

function getMethodFromFactoryName(
	factoryName: string,
): "get" | "post" | undefined {
	if (factoryName.includes("Get")) {
		return "get";
	}

	if (factoryName.includes("Post")) {
		return "post";
	}

	return undefined;
}

function isAuthRequired(factoryName: string): boolean {
	return factoryName.includes("WithAuth");
}

type RouteModule = Record<
	string,
	((req: Request) => Promise<Response>) & { config?: HandlerConfig }
>;

async function scanAndRegisterRoutes() {
	const routeFiles = globSync(`${API_DIR}/**/route.ts`);

	let registered = 0;
	const errors: string[] = [];

	for (const routeFile of routeFiles.toSorted((a, b) => a.localeCompare(b))) {
		const rel = relative(API_DIR, routeFile);
		const topSegment = rel.split("/")[0];

		if (SKIP_PATHS.has(topSegment)) {
			continue;
		}

		const apiPath = getApiPath(routeFile);

		let mod: RouteModule;
		try {
			mod = (await import(routeFile)) as RouteModule;
		} catch (error) {
			errors.push(`Failed to import ${rel}: ${String(error)}`);
			continue;
		}

		for (const [exportName, exported] of Object.entries(mod)) {
			if (exportName !== "GET" && exportName !== "POST") {
				continue;
			}

			if (typeof exported !== "function") {
				continue;
			}

			const config = exported.config as HandlerConfig | undefined;
			if (!config) {
				continue;
			}

			const method = getMethodFromFactoryName(config.factoryName);
			if (!method) {
				errors.push(`Unknown factory: ${config.factoryName} in ${rel}`);
				continue;
			}

			const security = isAuthRequired(config.factoryName)
				? [{ [bearerAuth.name]: [] }, {}]
				: undefined;

			const inputSchema = config.inputSchema;
			const outputSchema = config.outputSchema;

			const pathRegistration: Parameters<typeof registry.registerPath>[0] = {
				method,
				path: apiPath,
				responses: {
					200: {
						description: "Success",
						content: {
							"application/json": {
								schema: apiResponseSchema(outputSchema),
							},
						},
					},
					400: { $ref: "#/components/responses/ValidationError" },
					401: { $ref: "#/components/responses/Unauthorized" },
					500: { $ref: "#/components/responses/InternalError" },
				},
			};

			if (security !== undefined) {
				pathRegistration.security = security;
			}

			if (method === "post") {
				pathRegistration.request = {
					body: {
						required: true,
						content: {
							"application/json": {
								schema: inputSchema,
							},
						},
					},
				};
			} else {
				const hasQueryParams =
					inputSchema instanceof z.ZodObject &&
					Object.keys(inputSchema.shape).length > 0;

				if (hasQueryParams) {
					pathRegistration.request = {
						query: inputSchema,
					};
				}
			}

			registry.registerPath(pathRegistration);
			registered++;
		}
	}

	if (errors.length > 0) {
		for (const err of errors) {
			console.warn(`  WARN: ${err}`);
		}
	}

	return registered;
}

// Import edge function registrations (manual — no factory pattern, raw SchemaObject)
const { registerEdgeProcessInstagramImports } =
	await import("../src/lib/openapi/endpoints/instagram/edge-process-imports");
const { registerEdgeProcessRaindropImports } =
	await import("../src/lib/openapi/endpoints/raindrop/edge-process-imports");
const { registerEdgeProcessTwitterImports } =
	await import("../src/lib/openapi/endpoints/twitter/edge-process-imports");

// Register edge function endpoints
registerEdgeProcessInstagramImports();
registerEdgeProcessRaindropImports();
registerEdgeProcessTwitterImports();

// Scan and register all App Router factory-based endpoints
const registeredCount = await scanAndRegisterRoutes();
console.log(
	`Auto-inferred: ${registeredCount} App Router endpoints registered`,
);

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
	openapi: "3.0.3",
	info: {
		title: "Recollect API",
		version: "1.0.0",
		description:
			"Recollect API for bookmark management, organization, and import. Designed for mobile and frontend developers. Browser clients authenticate via cookies (automatic after login). Mobile/external clients use a Supabase JWT bearer token.",
	},
	tags: tagDescriptions,
	servers: [{ url: "/api", description: "Next.js API routes" }],
});

const outputPath = resolve(ROOT, "public/openapi.json");
writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf8");

const sharedSchemaExports = Object.keys(sharedSchemas).length;
console.log(
	`OpenAPI spec written (${sharedSchemaExports} shared schema exports, ${registeredCount} App Router endpoints)`,
);

// Merge supplementary data (tags, summary, description, security, examples)
// onto auto-inferred schemas. Run as a second pass to keep concerns separate.
const supplements = collectSupplements();
mergeSupplements(outputPath, supplements);
