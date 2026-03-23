# Recollect

Bookmark management app with AI enrichment — organize, search, and collaborate on web bookmarks.

**Stack**: Next.js 16.2.1 (App + Pages Router), Supabase, React Query, Zustand, Tailwind v4, Base UI

**Architecture**: Hybrid routing (App Router for new APIs, Pages Router for dashboard), optimistic mutations, pgmq queues for async processing.

Before any Next.js work, read the relevant doc in `node_modules/next/dist/docs/` — bundled docs match the installed version exactly.

## Domain

- **Base UI** (`@base-ui/react`): Primary component library. Combobox in `/src/components/ui/recollect/combobox`, ScrollArea in `scroll-area.tsx`
- **React Aria**: Legacy (dashboard + lightbox, 4 files)
- **Ariakit**: Specialized use cases
- **Multi-select**: `use-category-multi-select` hook with Base UI Combobox + match-sorter
- `category_id: 0` = Uncategorized (auto-managed) — keep `.min(0)` in schemas
- `ogImage` (camelCase) — not `og_image`
- OpenAPI tags are capitalized: `"Bookmarks"`, `"Categories"`, `"iPhone"`
- `knip` for detecting unused code when making large changes
- `src/utils/type-utils.ts`: centralized `toJson()` / `toDbType()` for Supabase type boundaries — use instead of inline `as unknown as Json` casts
- **Ultracite** (Oxlint + Oxfmt) enforces code quality — `pnpm fix` auto-fixes most issues, `pnpm dlx ultracite doctor` for setup diagnostics

## Commands

```bash
pnpm fix                  # Fix ALL auto-fixable issues (Ultracite + CSS + MD)
pnpm lint                 # Run ALL quality checks
pnpm lint:knip            # Detect unused code/exports/deps
pnpm lint:types:deno      # Deno type checks for Supabase Edge Functions
pnpm build                # Verify build passes
pnpm db:types             # Generate Supabase types from local schema
```

## References

- [`docs/CODEBASE_MAP.md`](./docs/CODEBASE_MAP.md) — Architecture map, module guides, data flows
- [`docs/OPENAPI_GUIDE.md`](./docs/OPENAPI_GUIDE.md) — OpenAPI endpoint docs (`/openapi-endpoints` skill)
- [`docs/project_overview.md`](./docs/project_overview.md) — Tech stack, features
- [`docs/project_structure.md`](./docs/project_structure.md) — Directory layout

## Verification

After changes, run in order:

1. `pnpm lint` — runs ALL quality checks in parallel (ultracite, types, knip, css, spelling, md)
2. `pnpm build` — confirm build passes (non-trivial changes)
