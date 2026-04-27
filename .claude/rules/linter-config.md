---
paths:
  - ".oxlintrc*"
  - "cspell.json"
  - ".lintstagedrc*"
  - "lint-staged.config*"
  - "AGENTS.md"
  - ".agents/**"
---

## Linter / Formatter Config Gotchas

- `.agents/` and `.claude/` are excluded from all linters/formatters (oxlint, oxfmt, cspell, markdownlint) — but NOT gitignored
- `AGENTS.md` and `CLAUDE.md` are separate tracked files — keep `AGENTS.md` as a regular file, not a symlink
- `lint-staged` uses `*` glob with raw `oxfmt` + `oxlint` (not `ultracite`): `oxfmt --no-error-on-unmatched-pattern` skips non-matching; `oxlint` ignores non-JS/TS
- `npx oxlint <files>` checks only listed files — CI runs `pnpm lint:ultracite` on ALL. Run full lint locally before pushing when enabling new rules
- CI cspell may flag hyphen-split words (e.g. "app-svgs" -> "svgs") — add to `cspell.json` `words` array
