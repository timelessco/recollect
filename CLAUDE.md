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

### After Every Code Change

1. Run IDE diagnostics (LSP) on modified files.
2. In parallel: `pnpm fix`, `pnpm lint:knip`, `pnpm lint:spelling`, `pnpm build` (non-trivial only).
