## Gotchas

Scope-loaded detail rules: `.claude/rules/next-config.md` (`next.config.ts`), `.claude/rules/release.md` (release scripts / `CHANGELOG.md`), `.claude/rules/oxlint.md` (`.oxlintrc.json`), `.claude/rules/routing.md` (pages/app routing), `.claude/rules/env.md` (env config), `.claude/rules/linter-config.md` (lint/fmt config). Release workflow: `/release` skill.

### Build / Dev

- `middleware.ts` is named `proxy.ts` — exports `proxy`, not `middleware`
- Check `lsof -iTCP:3000` before `pnpm dev` — may be running elsewhere
- Before `pnpm dev`, confirm Supabase local is up (`npx supabase status` or `lsof -iTCP:54321`). If the dev server is already running on 3000, Supabase is implicitly up — skip the check. Start via `pnpm db:start` if down
- `build:ci` skips env/OpenAPI/sitemap — use `pnpm build` locally
- No test suite — `pnpm test` exits 0 with "no test specified"
- CI runs lint only (no build gate); build failures surface on Vercel
- `pnpm lint:ultracite` needs Next generated types. CI runs `pnpm next:typegen` first; `next dev`/`pnpm build` create them locally. Run `pnpm next:typegen` manually only if lint fails on missing types

### HTTP / API

- `axios` is in deps but the rule is `fetch`-only — legacy, don't use for new code
- Object.Assign routes (`get-media-type`, `get-pdf-buffer`) use raw `NextResponse.json` for errors, NOT `apiError`/`apiWarn` — expected per migrator Section 4, don't flag

### React Query / Caching

- Paginated and search caches both use `PaginatedBookmarks` (bare `SingleListData[][]` pages). Search query key 3rd segment: always `buildSearchCategorySegment(CATEGORY_ID)` from `use-bookmark-mutation-context.ts` — never `searchSlugKey(categoryData)` (fails on cold loads). `secondaryQueryKey` only supported by `useReactQueryOptimisticMutation`; raw `useMutation` hooks rely on broad `[BOOKMARKS_KEY, userId]` invalidation

### Dependencies / CI

- `.ncurc.cjs` pins packages that can't upgrade (mirrors `.github/renovate.json` blocks) — keep both in sync
- GitHub Actions use pinned commit SHAs with version comments — get SHAs via `gh api repos/{owner}/{repo}/git/ref/tags/{tag}` when upgrading
