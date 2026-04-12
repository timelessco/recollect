# Recollect

Bookmark manager with AI enrichment. **Stack:** Next.js 16.2.1 (App + Pages Router), Supabase, React Query, Zustand, Tailwind v4, Base UI. **Architecture:** hybrid routing (App = new APIs, Pages = dashboard), optimistic mutations, pgmq queues for async work.

Before any Next.js work, read the relevant doc in `node_modules/next/dist/docs/` — bundled docs match the installed version exactly.

## Domain

- **UI libs:** Base UI (`@base-ui/react`) is primary — Combobox at `src/components/ui/recollect/combobox`, ScrollArea at `scroll-area.tsx`. React Aria is legacy (4 files: dashboard + lightbox). Ariakit for specialized cases
- **Multi-select:** `use-category-multi-select` hook (Base UI Combobox + match-sorter)
- `category_id: 0` = Uncategorized (auto-managed) — keep `.min(0)` in schemas
- Field casing: `ogImage` not `og_image`. OpenAPI tags capitalized: `"Bookmarks"`, `"Categories"`, `"iPhone"`
- **Supabase type boundaries:** `src/utils/type-utils.ts` `toJson()`/`toDbType()` — never inline `as unknown as Json`
- **Ultracite** (Oxlint + Oxfmt): `pnpm fix` auto-fixes, `pnpm dlx ultracite doctor` for setup diagnostics
- **Zod `.meta({ description })`** required on every schema field — flows to OpenAPI spec + Scalar UI
- **Env:** `@t3-oss/env-nextjs` in `src/env/` (split server/client, Vercel preset on server). Every `process.env` left in code has an inline comment explaining non-migration
- **v2 API contract:** `/api/v2/*` returns `T` on success (no envelope); errors return `{error: string}` + HTTP status. v2 uses `create-handler-v2.ts` with `error()`/`warn()` context helpers; non-v2 uses `create-handler.ts` + `{data, error}` envelope. `response.ts` is FROZEN — never modify `apiSuccess`/`apiError`/`apiWarn`
  - OpenAPI v2 supplements: bare response examples (`{ field: value }`), not envelope
  - v2 URL constants in `api-v2.ts` (ky `api` instance): **no leading slash** — `"v2/bookmark/..."`. v1 keeps leading slashes. Both in `constants.ts`
- `knip` for unused-code detection on large changes

## Commands

```bash
pnpm fix               # Auto-fix (Ultracite + CSS + MD)
pnpm lint              # All quality checks (parallel)
pnpm lint:knip         # Detect unused code
pnpm lint:types:deno   # Deno types for Edge Functions
pnpm build             # Verify build
pnpm db:types          # Generate Supabase types from local schema
pnpm prebuild:next     # Regenerate OpenAPI spec (SKIP_ENV_VALIDATION=1)
```

## References

- [`docs/CODEBASE_MAP.md`](./docs/CODEBASE_MAP.md) — architecture, module guides, data flows
- [`docs/OPENAPI_GUIDE.md`](./docs/OPENAPI_GUIDE.md) — OpenAPI endpoint docs (`/openapi-endpoints` skill)
- [`docs/project_overview.md`](./docs/project_overview.md) — tech stack, features
- [`docs/project_structure.md`](./docs/project_structure.md) — directory layout
- `.claude/agents/references/` — migration agent reference data

## Verification

After changes, run in order: `pnpm fix` → `pnpm lint` (all checks in parallel) → `pnpm build` (non-trivial changes).
