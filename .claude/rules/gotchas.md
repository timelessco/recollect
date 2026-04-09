## Gotchas

Scope-loaded detail rules: `.claude/rules/next-config.md` (`next.config.ts`), `.claude/rules/release.md` (release scripts / `CHANGELOG.md`), `.claude/rules/oxlint.md` (`.oxlintrc.json`). Release workflow: `/release` skill.

### Build / Dev

- `middleware.ts` is named `proxy.ts` — exports `proxy`, not `middleware`
- Check `lsof -iTCP:3000` before `pnpm dev` — may be running elsewhere
- `build:ci` skips env/OpenAPI/sitemap — use `pnpm build` locally
- No test suite — `pnpm test` exits 0 with "no test specified"
- CI runs lint only (no build gate); build failures surface on Vercel
- `pnpm lint:ultracite` needs Next generated types. CI runs `pnpm next:typegen` first; `next dev`/`pnpm build` create them locally. Run `pnpm next:typegen` manually only if lint fails on missing types

### Routing

- `src/pages/[category_id].tsx` catches ALL single-segment paths — new App Router pages at `/foo` 404 in dev because Pages dynamic routes take precedence
- New public pages must be added to `PUBLIC_PATHS` in `src/utils/constants.ts` — otherwise `proxy.ts` treats them as auth-protected
- `/discover` is blank without JS: `[category_id].tsx` gates render on `useMounted()`; `getServerSideProps` fetches but the component doesn't SSR-render — search engines see empty page

### HTTP / API

- `axios` is in deps but the rule is `fetch`-only — legacy, don't use for new code
- Object.Assign routes (`get-media-type`, `get-pdf-buffer`) use raw `NextResponse.json` for errors, NOT `apiError`/`apiWarn` — expected per migrator Section 4, don't flag

### Database

- `profiles.category_order` updates: batch concat (`|| v_new_category_ids`), NOT read-modify-write loops — Edge Function processes the queue in parallel (`Promise.allSettled`); SELECT-into-var + UPDATE causes lost writes (see `20260209` migration)
- Always `pnpm db:reset` before `pnpm db:types` — stale local DB drops RPC functions that exist in prod
- `createServerServiceClient()` (`@/lib/supabase/service`) is synchronous — don't `await`
- `@supabase/postgrest-js` ≥2.101.0 constrains `.eq()` column to `keyof Row`. For RPC functions with union overloads `Row` degrades and rejects valid columns — use `.filter("col", "eq", val)` (untyped column, same PostgREST query). Pass `undefined` (not `null`) for optional RPC args — `null` doesn't match `T | undefined`, breaking overload resolution

### Env

- `src/lib/supabase/constants.ts`, `src/utils/supabaseClient.ts`, and `src/site-config.ts` mix `NEXT_PUBLIC_*` + server vars, imported from both contexts — can't fully migrate to `@/env/*`. `NEXT_PUBLIC_*` → `@/env/client`; server vars stay as `process.env` with comment
- `process.env.X` is `string | undefined` by default — use `env.X` from `@/env/server`/`@/env/client` for typed access. `src/env/process-env.d.ts` is load-bearing: augments raw `process.env` for shared files that can't import `@/env/server`. Removing cascades `string | undefined` → Supabase client `any` → mass `no-unsafe-*` failures

### React Query / Caching

- Paginated and search caches both use `PaginatedBookmarks` (bare `SingleListData[][]` pages). Search query key 3rd segment: always `buildSearchCategorySegment(CATEGORY_ID)` from `use-bookmark-mutation-context.ts` — never `searchSlugKey(categoryData)` (fails on cold loads). `secondaryQueryKey` only supported by `useReactQueryOptimisticMutation`; raw `useMutation` hooks rely on broad `[BOOKMARKS_KEY, userId]` invalidation

### Async Code (oxlint traps)

- `no-floating-promises` + `no-misused-promises` both active. Prefix unhandled promises with `void`. Event handlers: sync wrapper with `void` — `onClick={() => { void doAsyncWork(); }}`. `startTransition` accepts async callbacks directly (React 19 types). Never `void (async () => {...})()` IIFE — breaks React transition tracking
- `require-await` checks outer function scope only — `await` inside nested callbacks (e.g. `startTransition(async () => { await ... })`) doesn't count. Remove outer `async`, keep inner
- `prefer-await-to-then` active — `.then()` chains in `queryFn`/`mutationFn` get flagged. Use `async () => { const data = await api.get(...).json<T>(); return mapFn(data); }`

### Linters / Formatters / Spelling

- `.agents/` and `.claude/` are excluded from all linters/formatters (oxlint, oxfmt, cspell, markdownlint) — but NOT gitignored
- `AGENTS.md` is a symlink to `CLAUDE.md` — don't replace with a regular file
- `lint-staged` uses `*` glob with raw `oxfmt` + `oxlint` (not `ultracite`): `oxfmt --no-error-on-unmatched-pattern` skips non-matching; `oxlint` ignores non-JS/TS
- `npx oxlint <files>` checks only listed files — CI runs `pnpm lint:ultracite` on ALL. Run full lint locally before pushing when enabling new rules
- CI cspell may flag hyphen-split words (e.g. "app-svgs" → "svgs") — add to `cspell.json` `words` array

### Dependencies / CI

- `.ncurc.cjs` pins packages that can't upgrade (mirrors `.github/renovate.json` blocks) — keep both in sync
- GitHub Actions use pinned commit SHAs with version comments — get SHAs via `gh api repos/{owner}/{repo}/git/ref/tags/{tag}` when upgrading
