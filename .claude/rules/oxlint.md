---
paths:
  - ".oxlintrc.json"
  - ".oxlintrc.*.json"
---

## oxlint Rules & Disables

Code-writing async traps (`no-floating-promises`, `require-await` nested scope, `prefer-await-to-then`) live in `.claude/rules/gotchas.md` — they apply whenever code is being written. This file covers config mechanics and lower-frequency rule behavior.

### Config

- `typeAware: true` + `typeCheck: true` in root `.oxlintrc.json` — type-aware rules + TS diagnostics run during `ultracite check` (no separate `lint:types`, single tsconfig). `no-unsafe-*` + `no-non-null-assertion` disabled in legacy folders via overrides (`src/pages/api/`, `src/async/`, `src/pageComponents/`, `src/utils/{worker,file-upload,helpers,apiHelpers}.ts`, `scripts/`); new code fully enforced. PostToolUse hook runs oxlint with root config including typeAware (~1s/file from type graph build)
- `promise-function-async` is off — only add `async` when `await` is in body
- `prefer-nullish-coalescing` auto-fix converts `||` → `??` — use block-level `/* oxlint-disable prefer-nullish-coalescing */` when `||` is intentional (boolean conds, empty-string-as-falsy chains)
- `perfectionist/sort-objects` + `sort-union-types` auto-fix oscillates with oxfmt on multi-line objects (upstream wontfix, oxc#20210). Fix violations manually first; auto-fix is stable only on already-sorted code

### Directives

- All disable directives use `oxlint-disable` (unified in oxlint 1.57) — `eslint-disable` treated as unused/unknown. `oxlint-disable-next-line` must be the exact line before the violation; doesn't work for multi-line JSX props or multi-line expressions (e.g. `@tanstack/query/exhaustive-deps` spanning a full `useQuery`) — use block-level `/* oxlint-disable rule */` / `/* oxlint-enable rule */`

### Testing a disabled rule

- oxlint `--deny RULE` CLI flag does NOT override config `"off"` — to test a disabled rule: copy `.oxlintrc.json` to temp, edit the copy, run `npx oxlint -c <copy>` from project root (relative `extends` paths require it), then `trash` the copy
