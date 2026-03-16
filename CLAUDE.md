# Recollect

Bookmark management app with AI enrichment — organize, search, and collaborate on web bookmarks.

**Stack**: Next.js 16 (App + Pages Router), Supabase, React Query, Zustand, Tailwind v4, Base UI

**Architecture**: Hybrid routing (App Router for new APIs, Pages Router for dashboard), optimistic mutations, pgmq queues for async processing.

## Domain

- **Base UI** (`@base-ui/react`): Primary component library. Combobox in `/src/components/ui/recollect/combobox`, ScrollArea in `scroll-area.tsx`
- **React Aria**: Legacy (dashboard + lightbox, 4 files)
- **Ariakit**: Specialized use cases
- **Multi-select**: `use-category-multi-select` hook with Base UI Combobox + match-sorter
- `category_id: 0` = Uncategorized (auto-managed) — keep `.min(0)` in schemas
- `ogImage` (camelCase) — not `og_image`
- OpenAPI tags are capitalized: `"Bookmarks"`, `"Categories"`, `"iPhone"`
- `knip` for detecting unused code when making large changes

## Commands

```bash
pnpm fix        # Auto-fix all (spelling → css → md → prettier → eslint)
pnpm lint:types # TypeScript strict checks
pnpm lint:knip  # Detect unused code/exports/deps
pnpm build      # Verify build passes
pnpm db:types   # Generate Supabase types from local schema
```

## References

- [`docs/CODEBASE_MAP.md`](./docs/CODEBASE_MAP.md) — Architecture map, module guides, data flows
- [`docs/OPENAPI_GUIDE.md`](./docs/OPENAPI_GUIDE.md) — OpenAPI endpoint docs (`/openapi-endpoints` skill)
- [`docs/project_overview.md`](./docs/project_overview.md) — Tech stack, features
- [`docs/project_structure.md`](./docs/project_structure.md) — Directory layout

## Verification

After changes, run in order:

1. `pnpm fix` — auto-fix all quality issues
2. `pnpm lint:types` — TypeScript strict checks
3. `pnpm lint:knip` — detect unused code (especially after large changes)
4. `pnpm build` — confirm build passes (non-trivial changes)
