---
review_agents:
  [
    kieran-typescript-reviewer,
    code-simplicity-reviewer,
    security-sentinel,
    performance-oracle,
  ]
plan_review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer]
---

# Review Context

## OpenAPI Architecture (established in PR #788)

- `src/lib/openapi/` is **build-time only**. `@asteasolutions/zod-to-openapi` is a devDependency. ESLint `no-restricted-imports` blocks runtime code from importing `@/lib/openapi/*`. Files within `src/lib/openapi/` can import each other. Do not flag this as a missing runtime dependency.
- Zod schemas live in a colocated `schema.ts` next to `route.ts`, not inline. OpenAPI registration and mutation hooks import from `schema.ts`, never `route.ts`. This breaks the transitive import chain to handler dependencies.
- Endpoint registration uses a barrel export in `src/lib/openapi/endpoints/index.ts`. The generation script auto-discovers via `Object.values()`. Adding a new endpoint requires a `register*()` function + barrel re-export.
- `@scalar/nextjs-api-reference` is correctly in `dependencies` (not devDeps) — it's imported at runtime by `src/app/api-docs/route.ts`.
- `public/openapi.json` is gitignored and generated pre-build via `prebuild:next` lifecycle script. Do not flag it as a missing committed file.

## Middleware / Auth

- `PUBLIC_PATHS` is a plain `as const` array, not a Set. `isPublicPath()` uses `.some()` with `startsWith` prefix matching. No `has()` is needed — do not suggest converting to Set.
- `/api-docs` is explicitly in `PUBLIC_PATHS`. It is also excluded from middleware by the matcher regex, but the explicit entry is intentional as defense-in-depth.
