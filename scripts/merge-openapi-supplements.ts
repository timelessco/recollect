/**
 * Merges supplementary OpenAPI data (tags, summary, description, security,
 * examples) into an auto-inferred spec produced by generate-openapi.ts.
 *
 * The auto-inferred spec has correct schemas but lacks human-authored metadata.
 * This script overlays that metadata without touching schema definitions.
 */
import { readFileSync, writeFileSync } from "node:fs";

import type { EndpointSupplement } from "../src/lib/openapi/supplement-types";

import * as aiEnrichmentSupplements from "../src/lib/openapi/endpoints/ai-enrichment";
import * as apiKeySupplements from "../src/lib/openapi/endpoints/api-key";
import * as bookmarksSupplements from "../src/lib/openapi/endpoints/bookmarks";
import * as bucketSupplements from "../src/lib/openapi/endpoints/bucket";
import * as categoriesSupplements from "../src/lib/openapi/endpoints/categories";
import * as categorySupplements from "../src/lib/openapi/endpoints/category";
import * as chromeBookmarksSupplements from "../src/lib/openapi/endpoints/chrome-bookmarks";
import * as cronSupplements from "../src/lib/openapi/endpoints/cron";
import * as devSupplements from "../src/lib/openapi/endpoints/dev";
import * as instagramSupplements from "../src/lib/openapi/endpoints/instagram";
import * as iphoneSupplements from "../src/lib/openapi/endpoints/iphone";
import * as pdfThumbnailSupplements from "../src/lib/openapi/endpoints/pdf-thumbnail";
import * as processQueueSupplements from "../src/lib/openapi/endpoints/process-queue";
import * as profilesSupplements from "../src/lib/openapi/endpoints/profiles";
import * as publicCategoriesSupplements from "../src/lib/openapi/endpoints/public-categories";
import * as raindropSupplements from "../src/lib/openapi/endpoints/raindrop";
import * as revalidateSupplements from "../src/lib/openapi/endpoints/revalidate";
import * as screenshotSupplements from "../src/lib/openapi/endpoints/screenshot";
import * as shareSupplements from "../src/lib/openapi/endpoints/share";
import * as tagsSupplements from "../src/lib/openapi/endpoints/tags";
import * as testsSupplements from "../src/lib/openapi/endpoints/tests";
import * as twitterSupplements from "../src/lib/openapi/endpoints/twitter";
import * as userSupplements from "../src/lib/openapi/endpoints/user";

interface OpenApiJsonContent {
  example?: unknown;
  examples?: Record<string, { description?: string; summary?: string; value: unknown }>;
  schema?: unknown;
}

interface OpenApiResponse {
  content?: {
    "application/json"?: OpenApiJsonContent;
  };
  description?: string;
}

interface OpenApiOperation {
  description?: string;
  parameters?: {
    example?: unknown;
    examples?: Record<string, { description?: string; summary?: string; value: unknown }>;
    in: string;
    name: string;
    schema?: unknown;
  }[];
  requestBody?: {
    content?: {
      "application/json"?: OpenApiJsonContent;
    };
    required?: boolean;
  };
  responses?: Record<string, { $ref: string } | OpenApiResponse>;
  security?: Record<string, string[]>[];
  summary?: string;
  tags?: string[];
}

interface OpenApiSpec {
  components?: {
    responses?: Record<string, OpenApiResponse>;
  };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

function resolveResponseRef(
  spec: OpenApiSpec,
  response: { $ref: string } | OpenApiResponse,
): OpenApiResponse {
  if ("$ref" in response) {
    const name = response.$ref.replace("#/components/responses/", "");
    const component = spec.components?.responses?.[name];
    if (component !== undefined) {
      return structuredClone(component);
    }

    return {};
  }

  return response;
}

function applySupplementToOperation(
  spec: OpenApiSpec,
  op: OpenApiOperation,
  supplement: EndpointSupplement,
): void {
  if (supplement.tags !== undefined) {
    op.tags = supplement.tags;
  }

  if (supplement.summary !== undefined) {
    op.summary = supplement.summary;
  }

  if (supplement.description !== undefined) {
    op.description = supplement.description;
  }

  if (supplement.security !== undefined) {
    op.security = supplement.security;
  }

  if (supplement.additionalResponses !== undefined) {
    op.responses ??= {};
    for (const [statusCode, responseData] of Object.entries(supplement.additionalResponses)) {
      const existing = op.responses[statusCode];
      if (existing !== undefined) {
        if ("$ref" in existing && statusCode !== "400") {
          continue;
        }

        const resolved = resolveResponseRef(spec, existing);
        resolved.description = responseData.description;
        op.responses[statusCode] = resolved;
      } else {
        op.responses[statusCode] = {
          description: responseData.description,
        };
      }
    }
  }

  const jsonContent = op.requestBody?.content?.["application/json"];

  if (jsonContent !== undefined) {
    if (supplement.requestExample !== undefined) {
      jsonContent.example = supplement.requestExample;
    }

    if (supplement.requestExamples !== undefined) {
      jsonContent.examples = supplement.requestExamples;
    }
  }

  const response200 = op.responses?.["200"];
  const response200Content =
    response200 !== undefined && !("$ref" in response200)
      ? response200.content?.["application/json"]
      : undefined;
  if (response200Content !== undefined) {
    if (supplement.responseExample !== undefined) {
      response200Content.example = supplement.responseExample;
    }

    if (supplement.responseExamples !== undefined) {
      response200Content.examples = supplement.responseExamples;
    }
  }

  if (supplement.response400Example !== undefined || supplement.response400Examples !== undefined) {
    const response400 = op.responses?.["400"];
    if (response400 !== undefined && !("$ref" in response400)) {
      response400.content ??= {};
      response400.content["application/json"] ??= {
        schema: {
          properties: {
            data: { type: "null" },
            error: { type: "string" },
          },
          required: ["data", "error"],
          type: "object",
        },
      };

      const content400 = response400.content["application/json"];
      if (supplement.response400Example !== undefined) {
        content400.example = supplement.response400Example;
      }

      if (supplement.response400Examples !== undefined) {
        content400.examples = supplement.response400Examples;
      }
    }
  }

  if (supplement.parameterExamples !== undefined && op.parameters !== undefined) {
    for (const param of op.parameters) {
      const examples = supplement.parameterExamples[param.name];
      if (examples !== undefined) {
        delete param.example;
        param.examples = examples;
      }
    }
  }
}

export function mergeSupplements(specPath: string, supplements: EndpointSupplement[]): void {
  const raw = readFileSync(specPath, "utf8");
  const spec = JSON.parse(raw) as OpenApiSpec;

  let applied = 0;
  const missing: string[] = [];

  for (const supplement of supplements) {
    const pathItem = spec.paths[supplement.path];
    if (pathItem === undefined) {
      missing.push(`${supplement.method.toUpperCase()} ${supplement.path}`);
      continue;
    }

    const op = pathItem[supplement.method];
    if (op === undefined) {
      missing.push(`${supplement.method.toUpperCase()} ${supplement.path}`);
      continue;
    }

    applySupplementToOperation(spec, op, supplement);
    applied += 1;
  }

  if (missing.length > 0) {
    for (const missingEndpoint of missing) {
      console.warn(`  WARN: Supplement not found in spec: ${missingEndpoint}`);
    }
  }

  writeFileSync(specPath, JSON.stringify(spec, null, 2), "utf8");
  console.log(`Supplements applied: ${applied}/${supplements.length}`);
}

export function collectSupplements(): EndpointSupplement[] {
  const allModules = [
    aiEnrichmentSupplements,
    apiKeySupplements,
    bookmarksSupplements,
    bucketSupplements,
    categoriesSupplements,
    categorySupplements,
    chromeBookmarksSupplements,
    cronSupplements,
    devSupplements,
    instagramSupplements,
    iphoneSupplements,
    pdfThumbnailSupplements,
    processQueueSupplements,
    profilesSupplements,
    publicCategoriesSupplements,
    raindropSupplements,
    revalidateSupplements,
    screenshotSupplements,
    shareSupplements,
    tagsSupplements,
    testsSupplements,
    twitterSupplements,
    userSupplements,
  ];

  const supplements: EndpointSupplement[] = [];
  for (const mod of allModules) {
    for (const value of Object.values(mod)) {
      if (
        typeof value === "object" &&
        value !== null &&
        "path" in value &&
        "method" in value &&
        typeof value.path === "string" &&
        typeof value.method === "string"
      ) {
        supplements.push(value as EndpointSupplement);
      }
    }
  }

  return supplements;
}

export { type EndpointSupplement } from "../src/lib/openapi/supplement-types";
