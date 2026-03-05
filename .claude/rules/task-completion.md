# Task Completion

## After Every Code Change

1. Run IDE diagnostics (LSP) on modified files
2. Run quality checks:

```bash
pnpm fix        # Auto-fix all (spelling -> css -> md -> prettier -> eslint)
pnpm lint:types # TypeScript strict checks
```

3. If types pass, verify build:

```bash
pnpm build
```

## Development Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Start dev server (Turbopack)
pnpm lint         # Run ALL quality checks
pnpm fix:prettier # Fix Prettier formatting
pnpm fix:css      # Fix CSS/Stylelint issues
pnpm fix:spelling # Fix cspell dictionary
pnpm fix:md       # Fix markdown issues
pnpm lint:knip    # Check for unused code
pnpm db:types     # Generate Supabase types from local schema
```

## After Dependency Changes

```bash
pnpm check:packages # Check for duplicates
pnpm lint:knip      # Detect unused deps/exports
```

## Pre-Commit (Automatic)

Husky + lint-staged runs: Prettier, spell checking, conventional commit validation.

## Self-Improvement

After any correction from the user, update `tasks/lessons.md` with the pattern to prevent repeating the same mistake.

## Elegance Check

For non-trivial changes: pause and ask "is there a more elegant way?" Skip for simple, obvious fixes.
