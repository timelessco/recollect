## Task Completion

### After Every Code Change

1. Run IDE diagnostics (LSP) on modified files
2. In parallel: `pnpm fix` (css → md → ultracite via turbo `dependsOn`), `pnpm lint:knip` (unused code, especially after large changes), `pnpm build` (non-trivial changes; chain: OpenAPI gen → next build → serwist build)

### Quality Gates by Task Type

| Task | Gates |
|---|---|
| Components | `pnpm fix` → verify ARIA → `pnpm build` |
| Styling | `pnpm lint:css` → `pnpm fix` → `pnpm build` |
| Utilities | `pnpm fix` → `pnpm lint:knip` |
| Documentation | `pnpm fix:md` |
| Dependencies | `pnpm check:packages` → `pnpm lint:knip` → `pnpm build` |
| Supabase migrations | `pnpm db:types` → verify `database-generated.types.ts` |

### Script Reference

Full list in `package.json`. Non-obvious:

- `pnpm build:ci` — CI-only, skips env/OpenAPI/sitemap
- `pnpm db:reset` / `pnpm db:start` — both sync vault secret via `./scripts/sync-vault-secret.sh`
- `pnpm next:typegen` — regen Next generated types (only if lint fails on missing types)
- `pnpm prebuild:next` — regen OpenAPI spec (`SKIP_ENV_VALIDATION=1`)
- `pnpm release:pr:yes` — agent/CI-friendly release PR (auto-confirms prompts)
- `pnpm release:cleanup` — post-release: merge main→dev, delete release branch

### Pre-Commit (Automatic)

- **pre-commit** (lint-staged): Ultracite fix on staged JS/TS/JSON
- **commit-msg** (commitlint): Conventional message validation (`@commitlint/config-conventional`)

