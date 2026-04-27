# Recollect

Bookmark manager with AI enrichment.

**Stack**: Next.js 16.2.1 (App + Pages Router), Supabase, React Query, Zustand, Tailwind v4, Base UI.

**Architecture**: hybrid routing (App = new APIs, Pages = dashboard), optimistic mutations, pgmq queues for async work.

Before any Next.js work, read `node_modules/next/dist/docs/`: bundled docs match the installed version.

## Domain

- **UI libs**: Base UI (`@base-ui/react`) primary. React Aria is legacy (4 files: dashboard + lightbox). Ariakit for specialized cases.
- **Field casing**: `ogImage` not `og_image`.
- **Ultracite** (Oxlint + Oxfmt): `pnpm fix` auto-fixes. `pnpm dlx ultracite doctor` for setup diagnostics.

## References

- [`docs/CODEBASE_MAP.md`](./docs/CODEBASE_MAP.md) — architecture, modules, data flows
- [`docs/OPENAPI_GUIDE.md`](./docs/OPENAPI_GUIDE.md) — OpenAPI endpoint docs (`/openapi-endpoints` skill)
- [`docs/project_overview.md`](./docs/project_overview.md) — tech stack, features
- [`docs/project_structure.md`](./docs/project_structure.md) — directory layout

## Project Rule Invocation Map

Use the existing project rule files directly on demand. Do not copy their full
contents into agent docs; treat `.claude/rules/` as canonical.

| Rule file                                  | Invoke when                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `.claude/rules/api-v1.md`                  | Editing legacy API routes in `src/pages/api/**` or non-v2 `src/app/api/**`.                       |
| `.claude/rules/api-v2.md`                  | Editing v2 App Router API routes, v2 handler factories, server context, or route error handling.  |
| `.claude/rules/build-dev.md`               | Touching build/dev config, Turbo, Next config, GitHub workflows, or local dev startup.            |
| `.claude/rules/commands.md`                | Choosing repo commands, validation scripts, pre-commit behavior, or rarely used pnpm scripts.     |
| `.claude/rules/deps-ci.md`                 | Updating dependency pinning, Renovate config, or GitHub Actions versions.                         |
| `.claude/rules/env.md`                     | Editing env access, Supabase constants, site config, or process env typing.                       |
| `.claude/rules/gotchas.md`                 | Before broad work, to route to path-scoped gotchas and release workflow notes.                    |
| `.claude/rules/linter-config.md`           | Editing lint, format, spelling, lint-staged, `.agents/**`, `.claude/**`, or `AGENTS.md`.          |
| `.claude/rules/middleware.md`              | Editing `proxy.ts` or middleware-equivalent request routing.                                      |
| `.claude/rules/next-config.md`             | Editing `next.config.*`, experimental Next flags, Sentry build config, or image loader behavior.  |
| `.claude/rules/openapi.md`                 | Editing OpenAPI generation, supplements, schemas, route scanner config, or API docs output.       |
| `.claude/rules/oxlint.md`                  | Editing oxlint config, disables, type-aware lint behavior, or rule testing.                       |
| `.claude/rules/react-query-cache.md`       | Editing React Query cache keys, optimistic mutations, paginated/search caches, or mutation hooks. |
| `.claude/rules/release.md`                 | Editing release scripts, changelog generation, or release PR formatting.                          |
| `.claude/rules/routing.md`                 | Editing App Router/Pages Router boundaries, route navigation, or auth redirects.                  |
| `.claude/rules/src-patterns.md`            | Editing TS/TSX source structure, React state, hooks, fetch/axios usage, or shared utilities.      |
| `.claude/rules/supabase-cli.md`            | Running or editing Supabase CLI workflows, local database commands, or type generation.           |
| `.claude/rules/supabase-edge-functions.md` | Editing Deno Edge Functions or shared Edge Function utilities.                                    |
| `.claude/rules/supabase-migrations.md`     | Creating, naming, or reviewing Supabase migration files.                                          |
| `.claude/rules/supabase-nextjs.md`         | Editing Supabase SSR clients, auth proxy behavior, cookies, or Next/Supabase integration.         |
| `.claude/rules/supabase-schema.md`         | Editing schema source files under `supabase/**` or generating schema diffs.                       |
| `.claude/rules/supabase-sql-patterns.md`   | Editing SQL functions, RLS, triggers, grants, or security definer/invoker behavior.               |
| `.claude/rules/supabase-sql.md`            | Editing SQL style, schema-qualified queries, table/column naming, or comments.                    |
| `.claude/rules/telemetry.md`               | Editing Axiom/Sentry routing, client/server logging, event payloads, sampling, or PII handling.   |
| `.claude/rules/zod-supabase.md`            | Editing Zod schemas, Supabase JSON/type boundaries, joined data handling, or OpenAPI examples.    |

### After Every Code Change

1. Run IDE diagnostics (LSP) on modified files.
2. In parallel: `pnpm fix`, `pnpm lint:knip`, `pnpm lint:spelling`, `pnpm build` (non-trivial only).
