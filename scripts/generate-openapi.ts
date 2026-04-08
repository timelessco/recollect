import { globSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import type { HandlerConfig } from "../src/lib/api-helpers/create-handler";

import { bearerAuth, registry } from "../src/lib/openapi/registry";
import { apiResponseSchema, v2ErrorResponseSchema } from "../src/lib/openapi/schemas/envelope";
import * as sharedSchemas from "../src/lib/openapi/schemas/shared";
import { collectSupplements, mergeSupplements } from "./merge-openapi-supplements";

// Extended config that includes new factory fields (withAuth/withPublic)
interface ExtendedHandlerConfig extends HandlerConfig {
  auth?: "none" | "required";
  contract?: "v2";
}

const ROOT = resolve(import.meta.dirname, "..");
const API_DIR = resolve(ROOT, "src/app/api");

const tagDescriptions: { description: string; name: string }[] = [
  {
    description: "Bookmark management: CRUD, trash, discover, and tag/category assignment",
    name: "Bookmarks",
  },
  {
    description: "Storage operations: pre-signed upload URLs for direct client-side file uploads",
    name: "Bucket",
  },
  {
    description: "Collection management: create, update, and delete collections",
    name: "Categories",
  },
  {
    description: "Scheduled maintenance tasks: trash cleanup",
    name: "Cron",
  },
  {
    description: "Development-only utilities: session token retrieval",
    name: "Dev",
  },
  {
    description: "Instagram bookmark sync: import and monitor import status",
    name: "Instagram",
  },
  {
    description: "Raindrop.io bookmark import: queue and monitor import status",
    name: "Raindrop",
  },
  {
    description: "Twitter/X bookmark sync: import folders and monitor import status",
    name: "Twitter",
  },
  {
    description: "User profile management: preferred OG domain settings",
    name: "Profiles",
  },
  {
    description: "iOS share extension error reporting",
    name: "iPhone",
  },
  {
    description: "PDF thumbnail generation for bookmarked documents",
    name: "PDF",
  },
];

const errorResponseSchema = {
  properties: {
    data: { type: "null" as const },
    error: { type: "string" as const },
  },
  required: ["data", "error"],
  type: "object" as const,
};

registry.registerComponent("responses", "Unauthorized", {
  content: {
    "application/json": {
      example: { data: null, error: "Not authenticated" },
      schema: errorResponseSchema,
    },
  },
  description: "Not authenticated. Provide a valid bearer token.",
});

registry.registerComponent("responses", "ValidationError", {
  content: {
    "application/json": {
      example: { data: null, error: "Invalid request parameters" },
      schema: errorResponseSchema,
    },
  },
  description: "Validation error. The request body or parameters are invalid.",
});

registry.registerComponent("responses", "InternalError", {
  content: {
    "application/json": {
      example: { data: null, error: "Failed to process request" },
      schema: errorResponseSchema,
    },
  },
  description: "Server error. The request could not be processed.",
});

// v2 error response components — bare `{ error: string }` (no `data` field)
registry.registerComponent("responses", "V2Unauthorized", {
  content: {
    "application/json": {
      example: { error: "Not authenticated" },
      schema: v2ErrorResponseSchema,
    },
  },
  description: "Not authenticated. Provide a valid bearer token.",
});

registry.registerComponent("responses", "V2ValidationError", {
  content: {
    "application/json": {
      example: { error: "Invalid request parameters" },
      schema: v2ErrorResponseSchema,
    },
  },
  description: "Validation error. The request body or parameters are invalid.",
});

registry.registerComponent("responses", "V2InternalError", {
  content: {
    "application/json": {
      example: { error: "Failed to process request" },
      schema: v2ErrorResponseSchema,
    },
  },
  description: "Server error. The request could not be processed.",
});

// Paths to skip — not part of the public API spec
const SKIP_PATHS = new Set<string>();

function getApiPath(routeFilePath: string): string {
  const rel = relative(API_DIR, routeFilePath);
  return `/${rel.replace(/\/route\.ts$/u, "")}`;
}

const METHOD_MAP: Record<string, "delete" | "get" | "patch" | "post" | "put"> = {
  Delete: "delete",
  Get: "get",
  Patch: "patch",
  Post: "post",
  Put: "put",
};

function getMethodFromFactoryName(
  factoryName: string,
): "delete" | "get" | "patch" | "post" | "put" | undefined {
  for (const [token, method] of Object.entries(METHOD_MAP)) {
    if (factoryName.includes(token)) {
      return method;
    }
  }

  return undefined;
}

function isAuthRequired(factoryName: string): boolean {
  return factoryName.includes("WithAuth");
}

type RouteModule = Record<
  string,
  ((req: Request) => Promise<Response>) & { config?: ExtendedHandlerConfig }
>;

async function scanAndRegisterRoutes() {
  const routeFiles = globSync(`${API_DIR}/**/route.ts`);

  let registered = 0;
  const errors: string[] = [];

  for (const routeFile of routeFiles.toSorted((a, b) => a.localeCompare(b))) {
    const rel = relative(API_DIR, routeFile);
    const topSegment = rel.split("/").at(0);

    if (topSegment !== undefined && SKIP_PATHS.has(topSegment)) {
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
      if (
        exportName !== "GET" &&
        exportName !== "POST" &&
        exportName !== "DELETE" &&
        exportName !== "PATCH" &&
        exportName !== "PUT"
      ) {
        continue;
      }

      if (typeof exported !== "function") {
        continue;
      }

      const { config } = exported;
      if (!config) {
        continue;
      }

      // Method from export key (primary) — already filtered to GET/POST/PATCH/PUT/DELETE
      const method = exportName.toLowerCase() as "delete" | "get" | "patch" | "post" | "put";

      // Validate: if old factory, check factoryName matches export key
      // New factory doesn't encode method in factoryName, so skip validation
      if (!("auth" in config) && config.factoryName) {
        const factoryMethod = getMethodFromFactoryName(config.factoryName);
        if (factoryMethod && factoryMethod !== method) {
          errors.push(
            `Method mismatch: export ${exportName} but factory ${config.factoryName} in ${rel}`,
          );
          continue;
        }
      }

      // New factory: explicit config.auth field
      // Old factory: parse factoryName for "WithAuth"
      const authRequired =
        "auth" in config ? config.auth === "required" : isAuthRequired(config.factoryName);

      const security = authRequired ? [{ [bearerAuth.name]: [] }, {}] : undefined;

      const { inputSchema } = config;
      const { outputSchema } = config;

      const isBodyMethod =
        method === "post" || method === "delete" || method === "patch" || method === "put";
      const hasInput =
        isBodyMethod ||
        (inputSchema instanceof z.ZodObject && Object.keys(inputSchema.shape).length > 0);

      // New factory: explicit config.contract field
      // Old factory: parse factoryName for "V2"
      const isV2 =
        "contract" in config ? config.contract === "v2" : config.factoryName.includes("V2");

      const pathRegistration: Parameters<typeof registry.registerPath>[0] = {
        method,
        path: apiPath,
        responses: {
          200: {
            content: {
              "application/json": {
                schema: isV2 ? outputSchema : apiResponseSchema(outputSchema),
              },
            },
            description: "Success",
          },
          ...(hasInput
            ? {
                400: {
                  $ref: isV2
                    ? "#/components/responses/V2ValidationError"
                    : "#/components/responses/ValidationError",
                },
              }
            : {}),
          401: {
            $ref: isV2
              ? "#/components/responses/V2Unauthorized"
              : "#/components/responses/Unauthorized",
          },
          500: {
            $ref: isV2
              ? "#/components/responses/V2InternalError"
              : "#/components/responses/InternalError",
          },
        },
      };

      if (security !== undefined) {
        pathRegistration.security = security;
      }

      if (isBodyMethod) {
        pathRegistration.request = {
          body: {
            content: {
              "application/json": {
                schema: inputSchema,
              },
            },
            required: true,
          },
        };
      } else {
        const hasQueryParams =
          inputSchema instanceof z.ZodObject && Object.keys(inputSchema.shape).length > 0;

        if (hasQueryParams) {
          pathRegistration.request = {
            query: inputSchema,
          };
        }
      }

      registry.registerPath(pathRegistration);
      registered += 1;
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
console.log(`Auto-inferred: ${registeredCount} App Router endpoints registered`);

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  info: {
    description:
      "Recollect API for bookmark management, organization, and import. Designed for mobile and frontend developers. Browser clients authenticate via cookies (automatic after login). Mobile/external clients use a Supabase JWT bearer token.",
    title: "Recollect API",
    version: "1.0.0",
  },
  openapi: "3.0.3",
  servers: [{ description: "Next.js API routes", url: "/api" }],
  tags: tagDescriptions,
});

const outputPath = resolve(ROOT, "public/openapi.json");
writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf-8");

const sharedSchemaExports = Object.keys(sharedSchemas).length;
console.log(
  `OpenAPI spec written (${sharedSchemaExports} shared schema exports, ${registeredCount} App Router endpoints)`,
);

// Merge supplementary data (tags, summary, description, security, examples)
// onto auto-inferred schemas. Run as a second pass to keep concerns separate.
const supplements = collectSupplements();
mergeSupplements(outputPath, supplements);
