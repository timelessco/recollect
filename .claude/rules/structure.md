---
paths:
  - "src/**/*.{ts,tsx}"
---

## Project Structure

### Path Alias

Single wildcard alias in `tsconfig.json`: `@/*` → `./src/*`

All imports use this pattern: `@/components/ui/button`, `@/lib/supabase`, `@/utils/helpers`, etc.

### Key Directories

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
├── types/            # TypeScript types (including database-generated.types.ts)
└── utils/            # Utility functions
```

### Routing Split

- **App Router** (`src/app/`): New API routes, auth/guest routes, API docs UI
- **Pages Router** (`src/pages/`): Dashboard (`[category_id]`), discover, public share, legacy API routes
- Root `/` redirects to `/everything`

### Dashboard Route Types

Three sidebar sections, each with different `CATEGORY_ID` resolution:
- **Navigation:** `/everything` (null), `/discover`, `/uncategorized` ("Inbox"), `/trash` — string slugs returned as-is
- **Collections:** Slug-based (e.g., `/funky-mhd2z350`) — resolved to numeric category ID via `getCategoryIdFromSlug` cache lookup
- **Type Views:** `/images`, `/videos`, `/links`, `/documents`, `/tweets`, `/instagram`, `/audios` — media type filters, NOT database categories. Slug string returned as-is (e.g., `"images"`)

### Component Patterns

- **Images**: NextImage with blurhash. **Links**: StyledLink. **Icons**: `/src/icons/svg/` + sprite build
- **Config**: `siteConfig.ts`. **Metadata**: `metadataUtils` for consistent SEO
