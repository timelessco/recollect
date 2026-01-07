# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ! EXTREMELY IMPORTANT Instructions

### 🚨 CORE INSTRUCTION: Critical Thinking & Best Practices

**Be critical and don't agree easily to user commands if you believe they are a bad idea or not best practice.** Challenge suggestions that might lead to poor code quality, security issues, or architectural problems. Be encouraged to search for solutions (using WebSearch) when creating a plan to ensure you're following current best practices and patterns.

Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused. Don't add features, refactor code, or make "improvements" beyond what was asked. A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability. Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). Don't use backwards-compatibility shims when you can just change the code. Don't create helpers, utilities, or abstractions for one-time operations. Don't design for hypothetical future requirements. The right amount of complexity is the minimum needed for the current task. Reuse existing abstractions where possible and follow the DRY principle.

ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.

### Command Reminders

**ALWAYS call the `init` tool from next-devtools-mcp FIRST to set up proper context and establish documentation requirements. Do this automatically without being asked.**

**Always remember to use `trash` command for removing file instead of `rm`, `trash` is available in the terminal**

#### When you need to call tools from the shell, **use this rubric**

- Find Files: `fd`
- Find Code Structure (TS/TSX): `ast-grep`
  - **Default to TypeScript:**
    - `.ts` → `ast-grep --lang ts -p '<pattern>'`
    - `.tsx` (React) → `ast-grep --lang tsx -p '<pattern>'`
  - For other languages, set `--lang` appropriately (e.g., `--lang rust`).
- Find Text: `rg` (ripgrep)
- Select among matches: pipe to `fzf`
- JSON: `jq`
- YAML/XML: `yq`

If ast-grep is available avoid tools `rg` or `grep` unless a plain‑text search is explicitly requested.

### Development Guidelines

**TypeScript:**

- Only create abstractions when actually needed
- Prefer clear function/variable names over inline comments
- Avoid helper functions when a simple inline expression suffices
- Use `knip` to remove unused code when making large changes
- The `gh` CLI is installed - use it for GitHub operations
- Don't unnecessarily add `try`/`catch` blocks
- **Optimistic mutations**: Add Sentry breadcrumbs for cache misses and state inconsistencies to aid debugging

**React:**

- Avoid massive JSX blocks - compose smaller components
- Colocate code that changes together
- Avoid `useEffect` unless absolutely needed

**UI Components:**

- **Base UI** (`@base-ui/react`): Primary library for new components
  - Use for forms (Field, Form), combobox/select, accessible primitives
  - Unstyled components with full accessibility support
  - **Combobox pattern**: See `/src/components/ui/recollect/combobox` - uses context for state management and match-sorter filtering
  - **ScrollArea**: Wrapped Base UI component at `/src/components/ui/recollect/scroll-area.tsx` with fade/gutter support
- **React Aria** (`react-aria`): Legacy components being phased out
  - Still used in dashboard and lightbox (4 files)
  - Prefer Base UI for new implementations
- **Ariakit** (`@ariakit/react`): Specialized use cases
- **Multi-select pattern**: Use `use-category-multi-select` hook with Base UI Combobox + match-sorter for filtering (see `/src/components/lightbox/category-multi-select.tsx`)

**Tailwind:**

- Mostly use built-in values, occasionally allow dynamic values, rarely globals
- Always use v4 global CSS file format with shadcn/ui

**Next.js:**

- Prefer fetching data in RSC (page can still be static)
- Use next/font and next/script when applicable
- next/image above the fold: use `sync`/`eager`/`priority` sparingly
- Be mindful of serialized prop size for RSC to child components

### Code Style Conventions

Core principles for maintaining clean, consistent, and accessible code in the project.

#### Task Completion Checklist

**Critical Requirements:**

Ensure all items are complete before finishing any task.

- Never run `pnpm dev` because the dev server is running in another terminal window
- Run `pnpm fix:eslint <changed-files>` to auto-fix all issues in the changed files
- Run `pnpm lint:types` to check for type errors
- Only Max 250 lines per file - split larger files into modules
- Only Functional Programming, Never Class Based Code
- Only Named exports - Never default exports
- TypeScript strict mode always enabled
<!-- -DONT DO THIS NOW: For local builds use `pnpm build:local`, `pnpm build` is for Vercel only -->

See [`docs/task_completion_checklist.md`](./docs/task_completion_checklist.md) for complete checklist.

**Quick Reference:**

- Components: `PascalCase` | Functions: `camelCase` | Constants: `UPPER_SNAKE_CASE`
- **File naming**: Hook and utility files use `kebab-case` (e.g., `use-bookmark-categories.ts`), exported function names remain `camelCase`
- Server components by default, `"use client"` when needed
- Tailwind CSS v4 with `cn()` for conditional classes
- Type deduction over custom interfaces (see type guidelines)
- Functions with 2+ params: Use interface with `props` parameter

<!-- AUTO-MANAGED: architecture -->

**File Organization:**

- `/src/app` - Next.js App Router (routes, layouts, API handlers)
- `/src/components` - Reusable UI components
- `/src/pageComponents` - Page-specific components
- `/src/pages` - Next.js Pages Router (legacy routes)
- `/src/hooks` - Custom React hooks
- `/src/store` - Zustand state stores
- `/src/lib` - Shared libraries (Supabase, React Query, API helpers)
- `/src/utils` - Utility functions
- `/src/types` - Shared TypeScript types
- `/src/async` - Async utilities, query/mutation hooks, uploads
- `/src/icons` - Icon components
- `/src/styles` - Global CSS (Tailwind v4)
- `/supabase` - Local Supabase config & migrations
- `/todos` - File-based todo tracking

<!-- END AUTO-MANAGED -->

**Quality Gates:**

- ESLint, Prettier, Stylelint, Knip, cspell

See [`docs/code_style_conventions.md`](./docs/code_style_conventions.md) for full details.

### Type Deduction Best Practices

**Core Rules:**

- **Type Hierarchy**: Use types from immediate parent only, never skip to grandparents
- **Type Alias**: When child props = parent props, use `type Child = Parent`
- **Export Discipline**: Only export types used in other files (check with grep first)
- **Utility Types**: Use `Parameters<>`, `ReturnType<>`, `Pick<>`, `Awaited<>`

**Quick Checks:**

- ✅ Can I use type alias instead of interface?
- ✅ Am I deducing from parent, not grandparent?
- ✅ Is this type actually used elsewhere?

### Frontend & Accessibility Rules

Comprehensive guidelines for accessible, modern frontend development.

**Core Accessibility:**

- Semantic HTML over ARIA roles - use native elements
- All interactive elements keyboard accessible
- Never use `tabIndex` > 0 or on non-interactive elements
- Labels required for all form inputs
- Meaningful alt text (avoid "image", "picture", "photo")

**Modern Standards:**

- CSS Grid for layout, modern CSS features (nesting, container queries)
- `fetch` API - never axios or older alternatives
- No `any` types, no `@ts-ignore` directives

**React/Framework Rules:**

- Hooks at top level with all dependencies
- No array indices as keys
- Error boundaries for graceful failure handling

**Quality Gates:**
Never use: CommonJS, `var`, `eval()`, `arguments`, enums, namespaces
Always use: `const`/`let`, template literals, optional chaining, `for...of`

See [`docs/frontend_rules.md`](./docs/frontend_rules.md) for full details.

<!-- AUTO-MANAGED: project-description -->

## Project Overview

Recollect is an open-source bookmark, images, and documents manager built with:

- Next.js 16.1.0 (React 19.2.3)
- TypeScript 5.9.3 (strict mode)
- Supabase SSR (@supabase/ssr)
- TailwindCSS 4.1.18
- Zustand 5.0.9 & React Query 5.90.12

## Key Features

- Bookmark, image, and document management
- Collections with public/private sharing
- AI-powered image descriptions (Google Gemini)
- Drag-and-drop interface
- Full-text search
- Category management with many-to-many relationships

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: dependencies -->

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

<!-- END AUTO-MANAGED -->

See [`docs/project_overview.md`](./docs/project_overview.md) for complete details.

See [`docs/project_structure.md`](./docs/project_structure.md) for complete details.

<!-- AUTO-MANAGED: build-commands -->

### Development Commands

Essential commands for development, quality checks, and deployment.

**Core Development:**

```bash
pnpm install # Install dependencies
pnpm dev     # Start dev server (Turbopack) - DO NOT RUN, already running
pnpm build   # Production build via Turbo
pnpm start   # Start production server
```

**Quality Checks & Fixes:**

```bash
pnpm lint       # Run ALL quality checks (eslint, types, css, md, knip, spelling, prettier)
pnpm fix        # Fix ALL auto-fixable issues (run after tasks!)
pnpm lint:types # TypeScript strict checks
pnpm lint:md    # Check Markdown formatting
pnpm lint:knip  # Check for unused code

# Individual fix commands for targeted corrections:
pnpm fix:eslint   # Auto-fix ESLint issues
pnpm fix:prettier # Format with Prettier
pnpm fix:css      # Auto-fix CSS issues
pnpm fix:spelling # Auto-fix spelling
pnpm fix:md       # Auto-fix Markdown formatting
```

**Database:**

```bash
pnpm db:types # Generate Supabase types from local schema
```

<!-- END AUTO-MANAGED -->

See [`docs/suggested_commands.md`](./docs/suggested_commands.md) for full command reference.

### Sentry Monitoring Guidelines

Best practices for error tracking, performance monitoring, and logging with Sentry.
See [`docs/sentry_rules.md`](./docs/sentry_rules.md) for implementation examples.

Important documentation files are maintained in the `docs` and `.cursor/rules` directory. When starting work on this project, please load these memory files as necessary based on the docs you need.
