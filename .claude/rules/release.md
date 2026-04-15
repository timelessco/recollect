---
paths:
  - "scripts/release-it/**"
  - "scripts/release/**"
  - "scripts/release-pr.sh"
  - ".release-it*"
  - ".github/workflows/release*.yml"
  - "CHANGELOG.md"
  - "docs/API_CHANGELOG.md"
---

## Release Pipeline

Full release workflow (prereqs, steps, Slack notification, verification) lives in the `/release` skill at `.claude/skills/release/SKILL.md`. The skill is canonical for the happy path. Rules below cover tool-level traps not captured there.

### Release-it / Changelog

- `pnpm release:dryrun` is interactive (prompts for version) — can't run via Bash tool. Leaves `package.json` version bump; clean up with `git checkout -- package.json`
- `@release-it/conventional-changelog` pinned to v9.x — v10.x has `whatBump` bug (unwaited `loadPreset`)
- `CHANGELOG.md` excluded from all linters/formatters (oxfmt, markdownlint, cspell) — formatting comes from Handlebars templates in `scripts/release-it/templates/`
- CHANGELOG sections: Notable Changes = `feat`/`fix` with body; Other Notable Changes = `refactor`/`perf`/`docs` with body; Breaking Changes = `!` in header
- GitHub blockquotes (`>`) render with constrained max-width — avoid for full-width content in `CHANGELOG.md` or GitHub releases
- `docs/API_CHANGELOG.md` is auto-appended by CI on pushes to `dev`, posted as a PR comment during release, and cleared during backmerge

### Shell / CI

- Shell scripts must be bash 3.2 compatible (macOS default) — no `declare -A`, use `case` + temp files
