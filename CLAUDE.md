# Recollect

Bookmark management app with AI enrichment -- organize, search, and collaborate on web bookmarks.

**Stack**: Next.js 16 (App + Pages Router), Supabase, React Query, Zustand, Tailwind v4, Base UI

**Architecture**: Hybrid routing (App Router for new APIs, Pages Router for dashboard), optimistic mutations, pgmq queues for async processing. See [`docs/CODEBASE_MAP.md`](./docs/CODEBASE_MAP.md).

## UI Components

- **Base UI** (`@base-ui/react`): Primary library. Combobox pattern in `/src/components/ui/recollect/combobox`, ScrollArea in `scroll-area.tsx`
- **React Aria**: Legacy (dashboard + lightbox, 4 files)
- **Ariakit**: Specialized use cases
- **Multi-select**: `use-category-multi-select` hook with Base UI Combobox + match-sorter

## Domain Conventions

- `category_id: 0` = Uncategorized (auto-managed) -- keep `.min(0)` in schemas
- `ogImage` (camelCase) -- not `og_image`
- OpenAPI tags are capitalized: `"Bookmarks"`, `"Categories"`, `"iPhone"`
- `knip` for detecting unused code when making large changes

## Rules

- [Code Style](/.claude/rules/code-style.md) -- React, TypeScript, naming, file organization
- [Frontend](/.claude/rules/frontend.md) -- Accessibility, CSS, compound components
- [API Routes](/.claude/rules/api-logging.md) -- Handler factories, response helpers
- [Sentry](/.claude/rules/sentry.md) -- Error tracking patterns
- [OpenAPI](/.claude/rules/openapi.md) -- Spec generation, supplements, edge functions
- [Zod + Supabase](/.claude/rules/zod-supabase.md) -- Schema gotchas
- [Supabase CLI](/.claude/rules/supabase-cli.md) -- Local dev, migrations, safety rules
- [Supabase Auth SSR](/.claude/rules/supabase-nextjs.md) -- Auth patterns (getAll/setAll only)
- [Supabase Functions](/.claude/rules/supabase-functions.md) -- PG function templates
- [Supabase RLS](/.claude/rules/supabase-rls.md) -- Row-level security policies
- [Supabase Schema](/.claude/rules/supabase-schema.md) -- Declarative schema management
- [Supabase SQL](/.claude/rules/supabase-sql.md) -- SQL style guide
- [Supabase Edge Functions](/.claude/rules/supabase-edge-functions.md) -- Deno edge functions
- [Supabase Migrations](/.claude/rules/supabase-migrations.md) -- File naming, RLS
- [Task Completion](/.claude/rules/task-completion.md) -- Verification commands

## References

- [`docs/CODEBASE_MAP.md`](./docs/CODEBASE_MAP.md) -- Architecture map, module guides, data flows
- [`docs/OPENAPI_GUIDE.md`](./docs/OPENAPI_GUIDE.md) -- OpenAPI endpoint docs (`/openapi-endpoints` skill)
- [`docs/project_overview.md`](./docs/project_overview.md) -- Tech stack, features
- [`docs/project_structure.md`](./docs/project_structure.md) -- Directory layout
