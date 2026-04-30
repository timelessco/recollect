## Gotchas

Path-scoped detail rules (auto-load by file type):

- `build-dev.md` — dev server, test suite, CI lint, `build:ci`, typegen, Supabase preflight (`package.json`, `turbo.json`, `next.config.ts`, `.github/workflows/**`).
- `react-query-cache.md` — paginated + search cache keys, optimistic mutation hook taxonomy (`src/async/**`, `**/use-*mutation*.ts`).
- `middleware.md` — `proxy.ts` naming (`**/proxy.ts`).
- `deps-ci.md` — ncurc pins, GHA pinned SHAs (`.ncurc.cjs`, `renovate.json`, `.github/workflows/**`).
- `next-config.md` — `next.config.ts`.
- `release.md` — release scripts / `CHANGELOG.md`.
- `oxlint.md` — `.oxlintrc.json`.
- `routing.md` — pages/app routing.
- `env.md` — env config.
- `linter-config.md` — lint/fmt config.
- `api-v1.md` / `api-v2.md` — route handlers (incl. Object.Assign routes exception).
- `src-patterns.md` — TS/TSX (incl. `axios` legacy/fetch-only rule).
- `openapi.md` — OpenAPI generation (`src/lib/openapi/**`, `scripts/*openapi*`).
- `supabase-cli.md` / `supabase-schema.md` — Supabase CLI + schema (`supabase/**`, `seed.sql`).
- `supabase-migrations.md` — migrations (`supabase/migrations/**`).
- `supabase-edge-functions.md` — Edge Functions (`supabase/functions/**`).
- `supabase-sql.md` / `supabase-sql-patterns.md` — SQL conventions (`*.sql`, `supabase/**/*.sql`).
- `supabase-nextjs.md` — Supabase ↔ Next.js integration (`src/lib/supabase/**`, clients, proxy).
- `telemetry.md` — Axiom vs Sentry routing (`src/**/*.{ts,tsx}`).
- `zod-supabase.md` — zod/types conventions (`src/**/*.{ts,tsx}`).

Release workflow: `/release` skill.
