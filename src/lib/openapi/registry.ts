/**
 * @module Build-time only
 *
 * This module mutates the global Zod prototype via `extendZodWithOpenApi`.
 * It MUST only be imported by build scripts (e.g., `scripts/generate-openapi.ts`).
 * Runtime imports will break production (devDependency) and cause global side effects.
 *
 * Enforced by ESLint `no-restricted-imports` rule — see eslint.config.js.
 */
import {
	extendZodWithOpenApi,
	OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent(
	"securitySchemes",
	"bearerAuth",
	{ type: "http", scheme: "bearer", bearerFormat: "JWT" },
);
