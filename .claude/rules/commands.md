## Task Completion

### After Every Code Change

1. Run IDE diagnostics (LSP) on modified files
2. Run quality checks:

```bash
pnpm fix        # Auto-fix all (spelling → css → md → prettier → eslint)
pnpm lint:types # TypeScript strict checks (includes next typegen + deno check)
pnpm lint:knip  # Detect unused code (especially after large changes)
```

3. If types pass, verify build:

```bash
pnpm build      # Runs OpenAPI gen → next build → next-sitemap
```

### Quality Gates by Task Type

- **Components**: `pnpm fix:eslint` → `pnpm lint:types` → verify ARIA → `pnpm build`
- **Styling**: `pnpm lint:css` → `pnpm fix:prettier` → `pnpm build`
- **Utilities**: `pnpm lint:types` → `pnpm lint:knip`
- **Documentation**: `pnpm fix:md` → `pnpm fix:spelling`
- **Dependencies**: `pnpm check:packages` → `pnpm lint:knip` → `pnpm build`
- **Supabase migrations**: `pnpm db:types` → verify `database-generated.types.ts`

### All Scripts

#### Build

```bash
pnpm build            # Turbo: OpenAPI gen → next build → next-sitemap
pnpm build:ci         # CI-only: skips env validation, OpenAPI gen, sitemap
pnpm build:analyze    # Bundle size analysis (opens browser)
pnpm build:debug      # Build with source maps + debug prerender
pnpm build:sourcemap  # Build with source maps + source-map-explorer
pnpm build:start      # Build then start server
```

#### Development

```bash
pnpm dev              # Start dev server (Turbopack)
pnpm dev:debug        # Dev with Node.js inspector
pnpm dev:scan         # Dev with react-scan overlay
pnpm dev:sourcemap    # Dev with source maps
pnpm dev:trace        # Dev with Turbopack tracing
pnpm start            # Start production server
```

#### Fix (auto-fix)

```bash
pnpm fix              # Turbo: full fix chain (spelling → css → md → prettier → eslint via dependsOn)
pnpm fix:eslint       # Auto-fix ESLint issues
pnpm fix:prettier     # Auto-fix formatting
pnpm fix:css          # Auto-fix Stylelint issues
pnpm fix:md           # Auto-fix markdown issues
pnpm fix:spelling     # Rebuild cspell dictionary from scratch
```

#### Lint (check only)

```bash
pnpm lint             # Turbo: all lint tasks in parallel
pnpm lint:eslint      # Check ESLint
pnpm lint:types       # next typegen → tsc --noEmit → deno check edge function
pnpm lint:css         # Check Stylelint
pnpm lint:md          # Check markdown
pnpm lint:knip        # Check unused code/exports/deps
pnpm lint:spelling    # Check spelling
pnpm lint:prettier    # Check formatting
```

#### Database

```bash
pnpm db:types         # Generate Supabase types from local schema
pnpm db:reset         # Reset local DB + sync vault secret
pnpm db:start         # Start Supabase + sync vault secret
```

#### Other

```bash
pnpm check:packages   # Check for duplicate dependencies
pnpm check:update     # Interactive dependency updates
pnpm check:engine     # Verify Node.js engine compatibility
pnpm clean            # Clean build artifacts
pnpm release          # Release with release-it
pnpm release:dryrun   # Dry-run release
pnpm cypress:open     # Open Cypress (no specs exist)
```

### Pre-Commit (Automatic)

- **pre-commit** (lint-staged): Prettier formatting on all staged files
- **commit-msg** (commitlint): Conventional commit message validation (`@commitlint/config-conventional`)

### Self-Improvement

After any correction from the user, update `tasks/lessons.md` with the pattern to prevent repeating the same mistake.

### Elegance Check

For non-trivial changes: pause and ask "is there a more elegant way?" Skip for simple, obvious fixes.
