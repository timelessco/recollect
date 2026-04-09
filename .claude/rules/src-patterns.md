---
paths:
  - "src/**/*.{ts,tsx}"
---

## Source Patterns (React + State + Structure)

### State Management

- **Zustand** — store files in `/src/store`, TS interfaces, actions separated from state
- **React Query** — key constants, custom hooks, error handling, optimistic updates
- **Optimistic mutations** — add Sentry breadcrumbs for cache misses and state inconsistencies

### Frontend

- **Tailwind v4 only** (never v3)
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

### Component Patterns

- **Images**: NextImage with blurhash
- **Links**: StyledLink
- **Icons**: `/src/icons/svg/` + sprite build
- **Config**: `siteConfig.ts`
- **Metadata**: `metadataUtils` for consistent SEO
