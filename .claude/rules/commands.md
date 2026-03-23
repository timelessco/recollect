## Task Completion

### After Every Code Change

1. Run IDE diagnostics (LSP) on modified files
2. Run in parallel:
   - `pnpm fix` — auto-fix all (css → md → ultracite)
   - `pnpm lint:knip` — detect unused code (especially after large changes)
   - `pnpm build` — confirm build passes (non-trivial changes)

### Quality Gates by Task Type

- **Components**: `pnpm fix` → verify ARIA → `pnpm build`
- **Styling**: `pnpm lint:css` → `pnpm fix` → `pnpm build`
- **Utilities**: `pnpm fix` → `pnpm lint:knip`
- **Documentation**: `pnpm fix:md`
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
pnpm fix              # Turbo: fix chain (css → md → ultracite via dependsOn)
pnpm fix:ultracite    # Auto-fix linting + formatting (Oxlint + Oxfmt)
pnpm fix:css          # Auto-fix Stylelint issues
pnpm fix:md           # Auto-fix markdown issues
```

#### Lint (check only)

```bash
pnpm lint             # Turbo: all lint tasks in parallel
pnpm lint:ultracite   # Check linting + formatting (Oxlint + Oxfmt)
pnpm lint:css         # Check Stylelint
pnpm lint:md          # Check markdown
pnpm lint:knip        # Check unused code/exports/deps
pnpm lint:spelling    # Check spelling
pnpm lint:types:deno  # Deno type checks for Supabase Edge Functions
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
pnpm release:pr       # Create release/* branch + PR to main
pnpm release:pr:dryrun # Preview release changelog (no mutations)
pnpm release:cleanup  # Post-release: merge main→dev, delete release branch
pnpm cypress:open     # Open Cypress (no specs exist)
```

### Pre-Commit (Automatic)

- **pre-commit** (lint-staged): Ultracite fix on staged JS/TS/JSON files
- **commit-msg** (commitlint): Conventional commit message validation (`@commitlint/config-conventional`)

### Elegance Check

For non-trivial changes: pause and ask "is there a more elegant way?" Skip for simple, obvious fixes.
