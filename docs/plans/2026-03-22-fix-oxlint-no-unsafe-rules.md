---
title: "fix: Enable oxlint no-unsafe-* type-aware rules"
type: fix
status: planned
date: 2026-03-22
---

## fix: Enable oxlint no-unsafe-\* type-aware rules

Enable the 6 `no-unsafe-*` rules currently kept `"off"` in `.oxlintrc.json`. These rules catch `any` type propagation — the root cause is Supabase query results and JSON columns typed as `any`.

## Estimated Scope

~677 violations across 6 rules. All interconnected — fixing upstream `any` eliminates downstream violations.

| Rule                       | ~Count | Root Cause                                                     |
| -------------------------- | ------ | -------------------------------------------------------------- |
| `no-unsafe-assignment`     | 216    | Supabase `.data` typed as `any`, JSON columns, worker messages |
| `no-unsafe-type-assertion` | 201    | `as Type` assertions on wide union types (111 files)           |
| `no-unsafe-member-access`  | 180    | Downstream of unsafe-assignment                                |
| `no-unsafe-return`         | 27     | Returning `any`-typed values                                   |
| `no-unsafe-call`           | 27     | Calling `any`-typed values                                     |
| `no-unsafe-argument`       | 26     | Passing `any` as typed params                                  |

## Hot Files (fix these first for max cascade)

1. `src/pageComponents/dashboard/sidePane/collectionsList.tsx` (82 violations) — DnD kit + category views typing
2. `src/utils/worker.ts` (44) — typed worker messages with `MessageEvent<T>`
3. `src/pages/api/bookmark/add-remaining-bookmark-data.ts` (31) — Supabase query generics
4. `src/async/supabaseCrudHelpers/index.ts` (14) — foundation data access types
5. `src/pages/api/v1/screenshot.ts` (22) — API response typing

## Strategy

1. Create typed Supabase query wrapper functions that propagate generics correctly
2. Fix `supabaseCrudHelpers/index.ts` first — it's the central data access layer
3. Type JSON columns (`category_views`, `bookmarksView`, `meta_data`) with proper interfaces
4. Add `MessageEvent<T>` generics to worker code
5. Work outward from core helpers to consumers
6. Use `oxlint-disable` only for third-party types that genuinely return `any`

## Acceptance Criteria

- [ ] All 6 `no-unsafe-*` rules removed from `"off"` list in `.oxlintrc.json`
- [ ] `pnpm lint:ultracite` passes with 0 errors
- [ ] No `as any` or `@ts-ignore` suppressions introduced
- [ ] `pnpm build` passes
