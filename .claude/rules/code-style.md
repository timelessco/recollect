---
paths: src/**/*.{ts,tsx}
---

# Code Style Conventions

## File Size Limits

- **Maximum 250 lines per file** -- extract sections, move to modules, split components

## Variable Declarations & Control Flow

- **Always `const`** -- use `.map()`, `.reduce()`, `for...of` instead of `let` counters
- **Always early returns** -- never `else` after a returning `if`. Guard -> early return -> happy path

## Naming Conventions

- **Components**: PascalCase (`HeaderNavigation.tsx`)
- **Functions/Hooks**: camelCase (`useMediaQuery`, `getFadeInProps`)
- **Constants**: UPPER_SNAKE_CASE (`SITE_NAME`)
- **Files**: kebab-case for non-component files
- **CSS Classes**: Tailwind utilities, custom in kebab-case

## React & State

- Prefer `useQuery`, `zustand` over `useEffect` for data fetching and state
- Colocate code that changes together
- Compose smaller components instead of massive JSX blocks
- **Optimistic mutations**: Add Sentry breadcrumbs for cache misses and state inconsistencies

## Next.js

- Prefer fetching data in RSC (page can still be static)
- Use `next/font` and `next/script` when applicable
- `next/image` above the fold: use `sync`/`eager`/`priority` sparingly
- Be mindful of serialized prop size for RSC to child components

## Type Deduction

- **Hierarchy**: Use types from immediate parent only, never skip to grandparents
- **Alias**: When child props = parent props, use `type Child = Parent`
- **Export Discipline**: Only export types used in other files (check with grep first)
- **Utility Types**: Use `Parameters<>`, `ReturnType<>`, `Pick<>`, `Awaited<>`

## React/Next.js Patterns

- **Exports**: Named exports preferred. Exceptions: Next.js pages, legacy query/mutation hooks
- **Component Structure**: Server by default, `"use client"` explicit, separate files for server/client
- **Props**: Always define TypeScript interfaces

## Styling

- **Tailwind CSS v4**: Primary method. Use `cn()` for conditional classes
- **Custom CSS**: Only in `global.css` when absolutely necessary

## File Organization

- `/src/components` -- Reusable UI
- `/src/pageComponents` -- Page-specific
- `/src/hooks` -- Custom hooks
- `/src/store` -- Zustand stores
- `/src/utils` -- Utilities
- `/src/types` -- Shared types
- `/src/async` -- Async utilities, API calls
- `/src/icons` -- Icon components

## Function Parameter Pattern

**2+ parameters -> use props object:**

```typescript
export interface ProcessDataProps {
	connection: DatabaseConnection;
	logger: Logger;
	timeout?: number;
}

export async function processData(
	props: ProcessDataProps,
): Promise<ProcessResult> {
	const { connection, logger, timeout = 5000 } = props;
	// ...
}

export type ProcessDataReturnType = Awaited<ReturnType<typeof processData>>;
```

## Best Practices

- **Images**: NextImage with blurhash. **Links**: StyledLink. **Icons**: `/src/icons/svg/` + sprite build
- **Config**: `siteConfig.ts`. **Env vars**: Zod validated, `NEXT_PUBLIC_` prefix for client
- **Metadata**: `metadataUtils` for consistent SEO

## Git Conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Pre-commit: Prettier, spell check, commitlint (husky + lint-staged)

## State Management

- **Zustand**: Store files in `/src/store`, TS interfaces, separate actions from state
- **React Query**: Key constants, custom hooks, error handling, optimistic updates

## Environment Variables

- All env vars validated using Zod schemas
- Separate client and server schemas
- Required prefix: `NEXT_PUBLIC_` for client-side vars
