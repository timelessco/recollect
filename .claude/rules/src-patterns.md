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

Native `fetch` is replaced by `ky` repo-wide (`axios` remains in deps but is legacy — don't use). Shared client instance `api` at `src/lib/api-helpers/api-v2.ts`: `ky.create({ prefix: "/api", timeout: 30_000 })`. Always import URL constants from `src/utils/constants.ts`; never inline `"v2/..."` strings.

**ky defaults differ from fetch** — 10s per-attempt timeout, 2 retries on GET/PUT/HEAD/DELETE for 5xx + [408, 413, 429]. POST/PATCH are NOT retried.

**`timeout` vs `signal`** — not interchangeable. ky's `timeout` option is a *headers-arrival* deadline: the internal timer is cleared the moment `fetch()` settles (headers received), so any subsequent `.arrayBuffer()` / large `.json()` body read is unbounded. A user-supplied `signal` (especially `AbortSignal.timeout(N)`) is a *wall-clock* deadline that ky never clears — it propagates through headers AND body reads via `AbortSignal.any`. Migration trap: `fetch(url, { signal: AbortSignal.timeout(N) })` → `ky.get(url, { timeout: N })` is NOT a semantic-preserving rewrite when the caller does `.arrayBuffer()` on untrusted/large responses (slow-body attack or slow CDN leaves the body read unbounded).

Three pin patterns to preserve fetch semantics:

- **`timeout: false`** — queue workers, server-to-server dispatches, upstream that owns its own budget. Use when there's no synchronous client waiting (`after()` bg dispatch, pgmq handlers, external render/screenshot services, client-side R2 PUT uploads where native fetch was unbounded). ky's 10s default otherwise aborts legitimate long-running ops as `TimeoutError`.
- **`signal: AbortSignal.timeout(N)` + `timeout: false`** — any call followed by `.arrayBuffer()` or large `.json()` where you need an end-to-end wall-clock bound (og-image download, PDF buffer proxy, video download). **Both options are required.** ky applies a 10s `timeout` default even when you pass `signal`, and composes the two via `AbortSignal.any` so whichever fires first wins — without `timeout: false`, a `signal: AbortSignal.timeout(60_000)` never ticks because the default 10s aborts the fetch first. Also, do NOT use `timeout: N` alone for body-read paths — ky clears that timer on headers-arrival, leaving the body read unbounded.
- **`retry: 0`** — idempotency-unsafe or amplifying calls. Use when: (1) retries duplicate external side effects (HEAD/GET to user URLs), (2) retries amplify bandwidth (PDF/video proxied through the server), (3) best-effort flows with graceful fallback (og-image re-upload), (4) expensive operations (screenshot capture, PDF render) in queue-worker context where pgmq already owns retry.

**Client + server pairing** — when the server handler proxies an external URL (e.g., `/v2/bookmarks/get/get-pdf-buffer`), add `retry: 0` at BOTH layers. Server `retry: 0` alone doesn't stop the client `api` instance from re-invoking the whole route on 5xx; cascade amplification needs the caller-side guard too.

When to use plain `timeout: N` (the weaker form): HEAD requests, short-latency small-JSON reads where the body-read bound is irrelevant. Match server timeout to the client ceiling — a server `timeout: 60_000` behind a client `api` 30s ceiling just wastes cycles after the client abandons.

### Category Multi-Select

Use the `use-category-multi-select` hook (Base UI Combobox + match-sorter) for any category multi-picker UI — don't rebuild selection/filter logic.
