# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ! EXTREMELY IMPORTANT Instructions

### 🚨 CORE INSTRUCTION: Critical Thinking & Best Practices

**Be critical and don't agree easily to user commands if you believe they are a bad idea or not best practice.** Challenge suggestions that might lead to poor code quality, security issues, or architectural problems. Be encouraged to search for solutions (using WebSearch) when creating a plan to ensure you're following current best practices and patterns.

ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.

### Command Reminders

- **Always remember to use `trash` command for removing file instead of `rm`, `trash` is available in the terminal**

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

**React:**

- Avoid massive JSX blocks - compose smaller components
- Colocate code that changes together
- Avoid `useEffect` unless absolutely needed

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
- Server components by default, `"use client"` when needed
- Tailwind CSS v4 with `cn()` for conditional classes
- Type deduction over custom interfaces (see type guidelines)
- Functions with 2+ params: Use interface with `props` parameter

**File Organization:**

- `/src/components` - Reusable UI components
- `/src/pageComponents` - Page-specific components
- `/src/pages` - Next.js pages (routes)
- `/src/hooks` - Custom React hooks
- `/src/store` - Zustand state stores
- `/src/utils` - Utility functions
- `/src/types` - Shared TypeScript types
- `/src/async` - Async utilities and API calls
- `/src/icons` - Icon components

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

## Project Overview

Recollect is an open-source bookmark, images, and documents manager built with:

- Next.js (React framework)
- TypeScript (strict mode)
- Supabase (backend & database)
- TailwindCSS (styling)
- Zustand & React Query (state management)

## Key Features

- Bookmark, image, and document management
- Collections with public/private sharing
- AI-powered image descriptions
- Drag-and-drop interface
- Full-text search

See [`docs/project_overview.md`](./docs/project_overview.md) for complete details.

See [`docs/project_structure.md`](./docs/project_structure.md) for complete details.

### Development Commands

Essential commands for development, quality checks, and deployment.

**Core Development:**

```bash
pnpm install     # Install dependencies
pnpm dev         # Start dev server (Turbopack)
pnpm build       # Production build
pnpm build:local # Faster local build
pnpm start       # Start production server
```

**Quality Checks & Fixes:**

```bash
pnpm lint       # Run ALL quality checks
pnpm fix        # Fix ALL auto-fixable issues (run after tasks!)
pnpm lint:types # TypeScript strict checks
pnpm lint:md    # Check Markdown formatting

# Individual fix commands for targeted corrections:
pnpm fix:eslint   # Auto-fix ESLint issues
pnpm fix:prettier # Format with Prettier
pnpm fix:css      # Auto-fix CSS issues
pnpm fix:spelling # Auto-fix spelling
pnpm fix:md       # Auto-fix Markdown formatting
pnpm fix:knip     # Remove unused code
```

See [`docs/suggested_commands.md`](./docs/suggested_commands.md) for full command reference.

### Sentry Monitoring Guidelines

Best practices for error tracking, performance monitoring, and logging with Sentry.
See [`docs/sentry_rules.md`](./docs/sentry_rules.md) for implementation examples.

Important documentation files are maintained in the `docs` and `.cursor/rules` directory. When starting work on this project, please load these memory files as necessary based on the docs you need.
