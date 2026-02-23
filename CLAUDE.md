# CLAUDE.md

Project-specific guidance for Claude Code. Generic rules are in `~/.claude/CLAUDE.md` and `.claude/rules/`.

## Codebase Overview

Recollect is a **bookmark management application** for organizing, searching, and collaborating on web bookmarks with AI enrichment.

**Stack**: Next.js 16 (App + Pages Router), Supabase (Auth, PostgreSQL, Storage, Edge Functions), React Query, Zustand, Tailwind v4, Base UI

**Architecture**: Hybrid routing (App Router for auth/new APIs, Pages Router for dashboard), optimistic mutations with React Query, pgmq queues for async processing (Instagram imports, AI enrichment)

For detailed architecture, module guides, and data flows, see [`docs/CODEBASE_MAP.md`](./docs/CODEBASE_MAP.md).

## Development Guidelines

### React & State

- Prefer `useQuery`, `zustand` over `useEffect` for data fetching and state
- Colocate code that changes together
- Compose smaller components instead of massive JSX blocks

### UI Components

- **Base UI** (`@base-ui/react`): Primary library for new components
  - Forms (Field, Form), combobox/select, accessible primitives
  - **Combobox pattern**: See `/src/components/ui/recollect/combobox` - context for state, match-sorter filtering
  - **ScrollArea**: `/src/components/ui/recollect/scroll-area.tsx` with fade/gutter support
- **React Aria** (`react-aria`): Legacy - still in dashboard and lightbox (4 files)
- **Ariakit** (`@ariakit/react`): Specialized use cases
- **Multi-select**: `use-category-multi-select` hook with Base UI Combobox + match-sorter

### TypeScript

- Use `knip` to remove unused code when making large changes
- **Optimistic mutations**: Add Sentry breadcrumbs for cache misses and state inconsistencies

### Next.js

- Prefer fetching data in RSC (page can still be static)
- Use next/font and next/script when applicable
- next/image above the fold: use `sync`/`eager`/`priority` sparingly
- Be mindful of serialized prop size for RSC to child components

## Project-Specific Guidelines

### Supabase & Migrations

- NEVER add database indexes without explicit user approval - may conflict with production
- NEVER create a new migration file when the user wants changes merged into an existing one — check for existing PR migrations first
- NEVER modify an already-committed migration file — it breaks remote/cloud sync. Only add new migrations with later timestamps for additive fixes
- NEVER put production-specific setup (vault secrets, pg_cron jobs) in migration files — these belong in `docs/setup-production-*.sql`
- NEVER reference columns in diagnostic SQL without first verifying them in `src/types/database-generated.types.ts`
- NEVER assume local migration files reflect prod state — this project has 3 environments (local / dev `cjsdfdveobrpffjbkpca` / prod `fgveraehgourpwwzlzhy`). Verify actual DB state before diagnosing
- NEVER hardcode the Supabase service role key in seed.sql or migrations — it rotates on each local restart; fetch dynamically via `docker exec supabase_edge_runtime_recollect printenv SUPABASE_SERVICE_ROLE_KEY`
- When creating migrations, consider: local dev, seed data, AND production differences
- Vault secrets differ between environments - document which secrets need manual setup
- pg_cron jobs NOT included in migrations - require post-deployment setup; local cron setup goes in `seed.sql` so `pnpm db:reset` configures the full dev environment
- Before writing SQL for any app table, verify column names from `src/types/database-generated.types.ts`
- Before writing SQL that references a pgmq queue name, verify the canonical name by reading the migration that calls `pgmq.create()` and cross-checking with any constants file
- `CREATE INDEX CONCURRENTLY` cannot run inside a `BEGIN/COMMIT` transaction — create a separate migration file outside any transaction for concurrent indexes
- SQL migrations must follow: `BEGIN/COMMIT`, PART separators, numbered steps, pre-flight `DO $$` validation, explicit `GRANT/REVOKE` on functions, post-migration verification, and `COMMENT ON`
- When seeding conflicts with migrations on fresh start (`npx supabase start`), use Supabase's `sql_paths` in `config.toml` with a cleanup pre-seed file — not a custom reset script

### API Patterns

- App Router endpoints go in `/src/app/api/`
- Legacy Pages Router endpoints in `/src/pages/api/` - migrate don't modify
- Mutation hooks follow naming pattern: `use-{action}-{resource}-mutation.ts` — do NOT include "optimistic" in the filename; optimistic behavior is an implementation detail
- Test API changes via Scalar UI at `/api-docs` (cookie auth works automatically when logged in)
- When adding or modifying an API route, update or create the corresponding OpenAPI endpoint definition in `src/lib/openapi/endpoints/<domain>/`
- The `/api/dev/session` endpoint requires a browser (not curl/CLI) — it relies on browser session cookies. When writing `.http` test file placeholders, never hardcode actual JWTs
- After modifying an API route, update corresponding OpenAPI named examples in the endpoint's `-examples.ts` file
- For API endpoint validation during development, use Chrome MCP to navigate to `/api-docs` and test via Scalar's Try It client — not curl
- When eliminating an API route via SSR refactor, (1) extract its Zod schemas to a shared module first, (2) verify the route is unused elsewhere before deleting
- For constants shared across TypeScript (Next.js) and Deno Edge Functions, define in `src/utils/constants.ts` and add `// Keep in sync with src/utils/constants.ts` comment in Deno files — cross-imports are impossible

### Type Deduction

- **Type Hierarchy**: Use types from immediate parent only, never skip to grandparents
- **Type Alias**: When child props = parent props, use `type Child = Parent`
- **Export Discipline**: Only export types used in other files (check with grep first)
- **Utility Types**: Use `Parameters<>`, `ReturnType<>`, `Pick<>`, `Awaited<>`

### Domain Conventions

- `category_id: 0` = Uncategorized collection (auto-managed) — keep `.min(0)` in schemas, don't change to `.positive()`
- `ogImage` (camelCase) is the established convention across codebase — not `og_image` (snake_case)
- OpenAPI tags are capitalized: `"Bookmarks"`, `"Categories"`, `"iPhone"` etc.

## References

- [`docs/CODEBASE_MAP.md`](./docs/CODEBASE_MAP.md) - **Complete architecture map, module guides, data flows**
- [`docs/project_overview.md`](./docs/project_overview.md) - Tech stack, features, architecture
- [`docs/project_structure.md`](./docs/project_structure.md) - Directory layout, file conventions
- [`docs/suggested_commands.md`](./docs/suggested_commands.md)

## Development Commands

**Core:**

```bash
pnpm install # Install dependencies
pnpm dev     # Start dev server (Turbopack) - DO NOT RUN, already running
pnpm build   # Production build via Turbo
pnpm start   # Start production server
```

**Quality:**

```bash
pnpm lint         # Run ALL quality checks
pnpm fix          # Auto-fix all (spelling → css → md → prettier → eslint via turbo deps)
pnpm fix:prettier # Fix Prettier formatting (run separately)
pnpm fix:css      # Fix CSS/Stylelint issues (run separately)
pnpm fix:spelling # Fix cspell dictionary (run separately)
pnpm fix:md       # Fix markdown issues (run separately)
pnpm lint:types   # TypeScript strict checks
pnpm lint:knip    # Check for unused code
pnpm db:types     # Generate Supabase types from local schema
```

**OpenAPI:**

```bash
npx tsx scripts/generate-openapi.ts # Regenerate OpenAPI spec (no pnpm alias)
```

- Endpoint definitions organized by domain: `src/lib/openapi/endpoints/{bookmarks,categories,tags,instagram,raindrop,twitter,iphone,profiles}/`
- Example data extracted to colocated `-examples.ts` files when endpoint exceeds 250 lines
- Named examples use kebab-case keys, `summary` + `description`, happy paths first then validation errors
- Shared schemas in `src/lib/openapi/schemas/shared.ts` — registered as `$ref` entries
- After modifying any endpoint or schema file, regenerate the spec and verify at `/api-docs`
- `public/openapi.json` is gitignored — regenerated by `prebuild:next` on every build, never committed
- New endpoints must be registered in `src/lib/openapi/endpoints/<domain>/index.ts` barrel, which re-exports via root barrel
- Security: `[{ [bearerAuth.name]: [] }, {}]` — empty `{}` means cookie auth also accepted (intentional, don't remove)
- Edge function security: use `serviceRoleAuth` (not `bearerAuth`) — it's a service role key, not a user JWT
- Edge function endpoints use per-path `servers` override (imported from `edge-function-servers.ts`) so Scalar sends requests to the correct Supabase host
- When using Supabase `.like()` with user-derived strings, escape `%` and `_` wildcards before the query

### Zod + Supabase Gotchas

- `z.looseObject` infers `{ [x: string]: unknown; ... }` — incompatible with Supabase's `Json` type. Use `z.object` for schemas consumed by route handlers returning Supabase data.
- In OpenAPI raw schema objects, do NOT use `as const` on `required` arrays — creates `readonly` tuple incompatible with `SchemaObject`'s `string[]`
- Prefer `z.int()` over `z.number().int()` — linter may auto-transform the latter to the former
- `z.iso.datetime()` rejects Supabase's `timestamptz` format (`+00:00` offset) — use `z.string()` for output schemas validating Supabase timestamp columns. Only use `z.iso.datetime()` for input schemas where the client sends `Z`-suffix timestamps via `toISOString()`
