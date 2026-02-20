# Task Completion Checklist

## After Every Task

```bash
pnpm fix        # Auto-fix all (spelling → css → md → prettier → eslint via turbo deps)
pnpm lint:types # TypeScript strict checks
```

If types pass, verify build:

```bash
pnpm build
```

## After Dependency Changes

```bash
pnpm check:packages # Check for duplicates
pnpm lint:knip      # Detect unused deps/exports
```

## Pre-Commit (Automatic)

Husky + lint-staged runs on `git commit`:

- Prettier formatting on staged files
- Spell checking dictionary updates
- Conventional commit message validation
