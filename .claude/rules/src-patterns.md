---
paths:
  - "src/**/*.{ts,tsx}"
---

## Source Patterns (React + State + Structure)

### State Management

- **Zustand** — store files in `/src/store`, TS interfaces, actions separated from state
- **React Query** — key constants, custom hooks, error handling, optimistic updates
- **Optimistic mutations** — route cache misses through `logCacheMiss` (Axiom only); see `telemetry.md`

### Frontend

- **Tailwind v4 only** (never v3)
- **Base UI wrappers** live in `src/components/ui/recollect/` — Combobox at `combobox/`, ScrollArea at `scroll-area.tsx`. Reuse these; don't reimport raw `@base-ui/react` primitives in feature code.
- **Compound Component Pattern** for complex UI (Combobox, Menu): export an object with subcomponents. Example from `src/components/ui/recollect/combobox/`:

```typescript
export const Combobox = {
	Root,     // Context provider + main wrapper
	Input,    // Text input
	Listbox,  // Dropdown options container
	Option,   // Individual option
	Chips,    // Selected items display
	Chip,     // Single chip
};
// Usage: <Combobox.Root><Combobox.Input /><Combobox.Listbox>...</Combobox.Listbox></Combobox.Root>
```

### Project Structure

Path alias: `@/*` → `./src/*` (single wildcard in `tsconfig.json`). All imports use `@/components/ui/button`, `@/lib/supabase`, `@/utils/helpers`, etc.

```
src/
├── app/              # App Router (new APIs, auth routes)
├── async/            # React Query hooks (queryHooks/)
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
├── icons/            # Icon components
├── lib/              # Core libraries (supabase, middleware, api-helpers)
├── pageComponents/   # Page-level component trees (colocated with pages)
├── pages/            # Pages Router (dashboard, legacy APIs)
├── store/            # Zustand stores
├── styles/           # Global CSS
├── types/            # TypeScript types (incl. database-generated.types.ts)
└── utils/            # Utility functions
```

### Routing Split

- **App Router** (`src/app/`): new API routes, auth/guest routes, API docs UI
- **Pages Router** (`src/pages/`): dashboard (`[category_id]`), discover, public share, legacy API routes
- Root `/` redirects to `/everything`

### Dashboard Route Types

Three sidebar sections with different `CATEGORY_ID` resolution:

- **Navigation**: `/everything` (null), `/discover`, `/uncategorized` ("Inbox"), `/trash` — string slugs returned as-is
- **Collections**: slug-based (e.g., `/funky-mhd2z350`) — resolved to numeric ID via `getCategoryIdFromSlug` cache lookup
- **Type Views**: `/images`, `/videos`, `/links`, `/documents`, `/tweets`, `/instagram`, `/audios` — media-type filters, NOT DB categories. Slug returned as-is (e.g., `"images"`)

### Async Code (oxlint traps)

- `no-floating-promises` + `no-misused-promises` both active. Prefix unhandled promises with `void`. Event handlers: sync wrapper with `void` — `onClick={() => { void doAsyncWork(); }}`. `startTransition` accepts async callbacks directly (React 19 types). Never `void (async () => {...})()` IIFE — breaks React transition tracking
- `require-await` checks outer function scope only — `await` inside nested callbacks (e.g. `startTransition(async () => { await ... })`) doesn't count. Remove outer `async`, keep inner
- `prefer-await-to-then` active — `.then()` chains in `queryFn`/`mutationFn` get flagged. Use `async () => { const data = await api.get(...).json<T>(); return mapFn(data); }`

### Component Patterns

- **Images**: NextImage with blurhash
- **Links**: StyledLink
- **Icons**: `/src/icons/svg/` + sprite build
- **Config**: `siteConfig.ts`
- **Metadata**: `metadataUtils` for consistent SEO

### HTTP Client (ky)

`fetch` → `ky` repo-wide (axios legacy). Shared `api` at `src/lib/api-helpers/api-v2.ts`: `ky.create({ prefix: "/api", timeout: 30_000 })`. URL constants from `src/utils/constants.ts` — never inline `"v2/..."`.

**Defaults:** 10s `timeout` (headers-arrival — cleared on settle, so body reads are unbounded); GET/PUT/HEAD/DELETE retry 2× on 5xx + [408, 413, 429]; POST/PATCH don't retry. `signal: AbortSignal.timeout(N)` = wall-clock via `AbortSignal.any`, guards headers + body. Rewriting `fetch+signal → ky+timeout` loses semantics on body reads.

Pin patterns:

- **`timeout: false`** — long calls (queue, external render, R2 PUT). On GET/PUT/HEAD/DELETE add **`retry: 0`** or a minute stall becomes 3×.
- **`signal: AbortSignal.timeout(N)` + `timeout: false`** (both) — body-read wall-clock. Without `timeout: false`, the 10s default composes with `signal` via `AbortSignal.any` and fires first; a 60s signal never ticks. `timeout: N` alone is wrong here.
- **`retry: 0`** — idempotency-unsafe / amplifying / pgmq-owned-retry. Proxied routes (`/v2/bookmarks/get/get-pdf-buffer`) need it at BOTH layers — server-only doesn't stop the `api` client from re-invoking on 5xx.

Plain `timeout: N` fits HEAD / small-JSON only. Server timeout ≤ client ceiling.

### Category Multi-Select

Use the `use-category-multi-select` hook (Base UI Combobox + match-sorter) for any category multi-picker UI — don't rebuild selection/filter logic.
