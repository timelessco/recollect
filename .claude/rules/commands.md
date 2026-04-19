## Commands

| Command | Purpose |
|---|---|
| `pnpm fix` | Auto-fix: runs `fix:css` + `fix:md` + `fix:ultracite` via turbo `dependsOn` |
| `pnpm fix:md` | markdownlint fix mode |
| `pnpm fix:css` | stylelint fix mode |
| `pnpm lint` | All checks in parallel: ultracite + knip + md + spelling + css |
| `pnpm lint:knip` | Detect unused code (especially after large changes) |
| `pnpm lint:spelling` | cspell check |
| `pnpm lint:css` | stylelint check only |
| `pnpm lint:types:deno` | Deno types for Edge Functions |
| `pnpm check:packages` | Outdated package check (`.ncurc.cjs` pins) |
| `pnpm build` | Full build chain: OpenAPI gen → next build → serwist build |
| `pnpm db:types` | Generate Supabase types from local schema |
| `pnpm prebuild:next` | Regenerate OpenAPI spec (`SKIP_ENV_VALIDATION=1`) |

Non-obvious / rarely-used scripts: `memory/reference_scripts.md`.

### Pre-Commit (Automatic)

- **pre-commit** (lint-staged): Ultracite fix on staged JS/TS/JSON.
- **commit-msg** (commitlint): Conventional message validation (`@commitlint/config-conventional`).
