# Changelog

## 0.1.0 (2026-03-19)

### 👀 Notable Changes

#### `deps`- ⏪ downgrade @release-it/conventional-changelog to 9.0.4

v10.x has a bug where bumper.loadPreset() is not awaited,
causing "whatBump is not a function". v9.0.4 uses a different
loading mechanism that works correctly.

Introduced in: [`25b4fe71`](https://github.com/timelessco/recollect/commit/25b4fe7113c7473227774c89bb72edbc74e506de)

#### `release`- 🐛 use string preset format for conventional-changelog

Object format { name: "conventionalcommits" } causes "whatBump
is not a function" error with @release-it/conventional-changelog v10.

Introduced in: [`d5878d08`](https://github.com/timelessco/recollect/commit/d5878d080ef5b6360f50a89af04087805bce38f8)

#### `deps`- 🐛 update @release-it/conventional-changelog to 10.0.6

Fixes "whatBump is not a function" error caused by
conventional-changelog < 7.2.0 dependency.

Introduced in: [`92d8f38f`](https://github.com/timelessco/recollect/commit/92d8f38f9d4af3b386a106d77419dedb9baa44d9)

#### `release`- ✨ add release pipeline with frozen release branches (#859)

- feat(release): ✨ add release pipeline scripts

* Add release-pr.sh to cut frozen release/\* branches from dev,
  generate grouped changelogs, and create PRs to main
* Add release-cleanup.sh to backmerge main into dev and delete
  release branches after successful deployment
* Add release:pr, release:pr:dryrun, release:cleanup to package.json
* Enforce clean working directory in release-it config

- docs(release): 📝 add release pipeline spec and plan

* Add design spec covering branch model, operator runbook,
  failure recovery, and acceptance criteria
* Add implementation plan with E2E verification checklist

- fix(release): 🐛 fix lint issues and harden scripts

* Fix markdown table alignment and heading levels in docs
* Replace "agentic" with "AI agents" for spellcheck
* Add fenced code block language specifier
* Prettier auto-formatted shell scripts

Introduced in: [`123de737`](https://github.com/timelessco/recollect/commit/123de737e8d0dc64c102a5c5e8c3d5d4c174ce73)

### 🗃️ Commits

#### ⭐ New Features

- **`release:`** ✨ add release pipeline with frozen release branches ([#859](https://github.com/timelessco/recollect/issues/859)) - [123de73](https://github.com/timelessco/recollect/commit/123de737e8d0dc64c102a5c5e8c3d5d4c174ce73) by @navin-moorthy

#### 🐞 Bug Fixes

- **`deps:`** ⏪ downgrade @release-it/conventional-changelog to 9.0.4 - [25b4fe7](https://github.com/timelessco/recollect/commit/25b4fe7113c7473227774c89bb72edbc74e506de) by @navin-moorthy
- **`deps:`** 🐛 update @release-it/conventional-changelog to 10.0.6 - [92d8f38](https://github.com/timelessco/recollect/commit/92d8f38f9d4af3b386a106d77419dedb9baa44d9) by @navin-moorthy
- **`release:`** 🐛 use string preset format for conventional-changelog - [d5878d0](https://github.com/timelessco/recollect/commit/d5878d080ef5b6360f50a89af04087805bce38f8) by @navin-moorthy

#### ⏪️ Reverted Changes

- **`release:`** ⏪ restore object preset format - [ab86a0a](https://github.com/timelessco/recollect/commit/ab86a0aa9be376bca2ad5c61b48895226f5f70f5) by @navin-moorthy

#### 🔨 Maintenance Updates

- **`spelling:`** 🔧 rebuild cspell project dictionary - [1f58a2f](https://github.com/timelessco/recollect/commit/1f58a2fee4b3004bbb9ce2fcf65c375ab749cc6d) by @navin-moorthy
