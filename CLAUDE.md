# CLAUDE.md

Project-specific guidance for Claude Code. Generic rules are in `~/.claude/CLAUDE.md` and `.claude/rules/`.

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
- When creating migrations, consider: local dev, seed data, AND production differences
- Vault secrets differ between environments - document which secrets need manual setup
- pg_cron jobs NOT included in migrations - require post-deployment setup
- RLS policies must be tested with BOTH anon and authenticated roles

### API Patterns

- App Router endpoints go in `/src/app/api/`
- Legacy Pages Router endpoints in `/src/pages/api/` - migrate don't modify
- Mutation hooks follow pattern: `use-{action}-{entity}-mutation.ts`
- Test API changes with bearer token auth before marking complete

### Type Deduction

- **Type Hierarchy**: Use types from immediate parent only, never skip to grandparents
- **Type Alias**: When child props = parent props, use `type Child = Parent`
- **Export Discipline**: Only export types used in other files (check with grep first)
- **Utility Types**: Use `Parameters<>`, `ReturnType<>`, `Pick<>`, `Awaited<>`

## References

- [`docs/task_completion_checklist.md`](./docs/task_completion_checklist.md)
- [`docs/code_style_conventions.md`](./docs/code_style_conventions.md)
- [`docs/frontend_rules.md`](./docs/frontend_rules.md)
- [`docs/sentry_rules.md`](./docs/sentry_rules.md)
- [`docs/project_overview.md`](./docs/project_overview.md)
- [`docs/project_structure.md`](./docs/project_structure.md)
- [`docs/suggested_commands.md`](./docs/suggested_commands.md)

## Project Overview

Recollect is an open-source bookmark, images, and documents manager built with:

- Next.js 16.1.0 (React 19.2.3)
- TypeScript 5.9.3 (strict mode)
- Supabase SSR (@supabase/ssr)
- TailwindCSS 4.1.18
- Zustand 5.0.9 & React Query 5.90.12

### Key Features

- Bookmark, image, and document management
- Collections with public/private sharing
- AI-powered image descriptions (Google Gemini)
- Drag-and-drop interface
- Full-text search
- Category management with many-to-many relationships

## Key Dependencies

| Category   | Package               | Version |
| ---------- | --------------------- | ------- |
| Framework  | next                  | 16.1.0  |
| React      | react, react-dom      | 19.2.3  |
| TypeScript | typescript            | 5.9.3   |
| Styling    | tailwindcss           | 4.1.18  |
| Backend    | @supabase/ssr         | 0.8.0   |
| State      | zustand               | 5.0.9   |
| Data       | @tanstack/react-query | 5.90.12 |
| Forms      | react-hook-form       | 7.68.0  |
| Validation | zod                   | 4.2.1   |
| UI         | @base-ui/react        | 1.0.0   |
| UI         | @ariakit/react        | 0.3.7   |
| UI         | react-aria            | 3.45.0  |
| Monitoring | @sentry/nextjs        | 10.32.0 |
| State      | immer                 | 11.1.3  |

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
pnpm lint       # Run ALL quality checks
pnpm fix        # Fix ALL auto-fixable issues
pnpm lint:types # TypeScript strict checks
pnpm lint:knip  # Check for unused code
pnpm db:types   # Generate Supabase types from local schema
```
