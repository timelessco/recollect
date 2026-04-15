/**
 * @module Build-time only
 *
 * This module mutates the global Zod prototype via `extendZodWithOpenApi`.
 * It MUST only be imported by build scripts (e.g., `scripts/generate-openapi.ts`).
 * Runtime imports will break production (devDependency) and cause global side effects.
 *
 * Enforced by ESLint `no-restricted-imports` rule — see eslint.config.js.
 */
import { extendZodWithOpenApi, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  bearerFormat: "JWT",
  description:
    "Supabase JWT token. Browser clients use cookie auth automatically. Mobile/external clients pass this token in the Authorization header.",
  scheme: "bearer",
  type: "http",
});

export const serviceRoleAuth = registry.registerComponent("securitySchemes", "serviceRoleAuth", {
  description:
    "Supabase service role key. Required for edge function workers. Get it locally via: docker exec supabase_edge_runtime_recollect printenv SUPABASE_SERVICE_ROLE_KEY",
  scheme: "bearer",
  type: "http",
});

export const workerResponseRef = registry.registerComponent("schemas", "WorkerResponse", {
  properties: {
    archived: { type: "integer" },
    message: { type: "string" },
    processed: { type: "integer" },
    retry: { type: "integer" },
    skipped: { type: "integer" },
  },
  required: ["processed", "archived", "skipped", "retry"],
  type: "object",
});
