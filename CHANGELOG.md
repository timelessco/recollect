# Changelog

## 0.4.0 (2026-03-20)

### 👀 Notable Changes


#### `lightbox` — add velocity-based swipe-to-close on mobile

> <sub>Desktop close-on-swipe was already velocity-based (wheel deltaY scales with speed), but mobile touch required dragging the full 200px threshold regardless of flick speed.
> 
> Add velocity tracking using an 80ms sample window during touch moves. On pointer up, if downward velocity exceeds 800px/s and the user has dragged at least 30px, close immediately.</sub>

<sub>Introduced in [`68510a93`](https://github.com/timelessco/recollect/commit/68510a93d399c5838a9f141067e3c943e875c0f5)</sub>


---


#### `release` — 🐛 use separate commit for API changelog clear

> <sub>- --amend rewrites the merge commit SHA, breaking   merge-base --is-ancestor check in release-pr.sh - Separate commit preserves the merge commit identity</sub>

<sub>Introduced in [`81b92e78`](https://github.com/timelessco/recollect/commit/81b92e78d771e21dd9c82afa42dc22495ac5c842)</sub>


---


#### `release` — 🚀 add timestamp to release PR titles

> <sub>- Include time (HHMM) in branch name for same-day uniqueness - Use conventional commit format with human-readable timestamp - Re-enable Semantic PR validation for release branches</sub>

<sub>Introduced in [`4900cc7b`](https://github.com/timelessco/recollect/commit/4900cc7bcb17789de7749f597ee9b2f8df4f8a34)</sub>


---


#### `deps` — update @base-ui/react to 1.3.0

> <sub>Fixes mobile drawer scroll by upgrading Base UI which adds cross-axis scroll detection for horizontal-swipe drawers. Also updates DrawerPreview import to Drawer (API graduated).</sub>

<sub>Introduced in [`6a05b57a`](https://github.com/timelessco/recollect/commit/6a05b57aafb9945318473a77bce18b94a8b4fbcb)</sub>


---


#### `ai` — contextual AI summaries based on content type

> <sub>Replace the one-size-fits-all image captioning prompt with content-type-aware prompts. A resolveContentType utility maps bookmark signals (type, mediaType, isPageScreenshot) to one of 8 content types: link, screenshot, image, video, audio, document, tweet, instagram.
> 
> Each type gets a tailored SENTENCE prompt that incorporates bookmark metadata (title, URL, description) for smarter summaries. Audio files skip AI enrichment entirely.
> 
> Also fixes a bug where title/description/url context was only passed to the AI when the user had collections.</sub>

<sub>Introduced in [`1ebababc`](https://github.com/timelessco/recollect/commit/1ebababcfe379fe08d5f0efbc376961a7e974bf0)</sub>




### 📌 Other Notable Changes


#### `release` — 📝 finalize Slack notification format

> <sub>- Use **double asterisks** for bold (headers, authors, PR title) - Remove :rocket: prefix from main message - Tag Karthik only in API changelog thread reply</sub>

<sub>Introduced in [`1fe9be25`](https://github.com/timelessco/recollect/commit/1fe9be25f80eea035529dd1a07d5f7c02a9c8635)</sub>


---


#### `release` — 📝 add Slack notification step to release skill

> <sub>- Add Step 2: notify Slack with single-line PR link, changelog in thread - Renumber subsequent steps 3-6 for sequential flow - Update release label references (Semantic PR now runs on releases)</sub>

<sub>Introduced in [`646e5f21`](https://github.com/timelessco/recollect/commit/646e5f21c19cdcca5fead899afff04698731835f)</sub>


---


#### `gotchas` — 📝 update release label behavior

> <sub>- Semantic PR validation now runs on release PRs</sub>

<sub>Introduced in [`273d600a`](https://github.com/timelessco/recollect/commit/273d600a5911502de7545d099cf04aeb183d74e3)</sub>


---


#### `gotchas` — 📝 add release pipeline learnings

> <sub>- Document --admin requirement for branch protection - Add backmerge SHA verification gotcha - Document API changelog lifecycle - Update pipeline description with current flow</sub>

<sub>Introduced in [`921bc8a8`](https://github.com/timelessco/recollect/commit/921bc8a89c3d8e8ccebd6101499899f7fd3ac393)</sub>


---


#### `release` — 📝 update skill with session learnings

> <sub>- Add --admin flag for branch protection bypass - Fix backmerge verification (check dev tip, not diff) - Document cleanup job timing and API changelog flow - Add prerequisite check commands</sub>

<sub>Introduced in [`4175675d`](https://github.com/timelessco/recollect/commit/4175675df86bffd65e3b9b3e8afc9fc698c51478)</sub>




<details>
<summary>🗃️ Commits</summary>



#### ⭐ New Features

- **`ai`** contextual AI summaries based on content type — [`1ebabab`](https://github.com/timelessco/recollect/commit/1ebababcfe379fe08d5f0efbc376961a7e974bf0) · @rogerantony-dev

- **`api`** add isOgImagePreferred option for enhanced image processing — [`e32d344`](https://github.com/timelessco/recollect/commit/e32d344e47e15ec95612a61793e2b2ba4ea921f0) · @rogerantony-dev

- **`imageToText`** enhance image processing with isOgImage option — [`befc6d6`](https://github.com/timelessco/recollect/commit/befc6d6f5d98dbfcd6dd34fdf67bfd1cc79f5915) · @rogerantony-dev

- **`release`** 🚀 add timestamp to release PR titles — [`4900cc7`](https://github.com/timelessco/recollect/commit/4900cc7bcb17789de7749f597ee9b2f8df4f8a34) · @navin-moorthy



#### 🐞 Bug Fixes

- **`api`** update content type resolution and enhance error handling in bookmark data retrieval — [`27d7087`](https://github.com/timelessco/recollect/commit/27d7087fb90ce5af3fc75fe1eecf61932834f3b6) · @rogerantony-dev

- **`deps`** update @base-ui/react to 1.3.0 — [`6a05b57`](https://github.com/timelessco/recollect/commit/6a05b57aafb9945318473a77bce18b94a8b4fbcb) · @rogerantony-dev

- **`lightbox`** add velocity-based swipe-to-close on mobile — [`68510a9`](https://github.com/timelessco/recollect/commit/68510a93d399c5838a9f141067e3c943e875c0f5) · @rogerantony-dev

- **`release`** 🐛 use separate commit for API changelog clear — [`81b92e7`](https://github.com/timelessco/recollect/commit/81b92e78d771e21dd9c82afa42dc22495ac5c842) · @navin-moorthy



#### ♻️  Code Refactoring

- **`api`** replace hardcoded model string with GEMINI_MODEL constant — [`1f1520c`](https://github.com/timelessco/recollect/commit/1f1520c50960ee853f297059004f0486ee6174ca) · @rogerantony-dev

- **`api`** streamline content type resolution and improve error tracking — [`3356d4a`](https://github.com/timelessco/recollect/commit/3356d4ac24e5cb96b7c825b82380c4ed568e8c6d) · @rogerantony-dev

- **`imageToText`** update summarization instructions for webpages, videos — [`a2a60e0`](https://github.com/timelessco/recollect/commit/a2a60e0aae22f8fae7626ae9ddc63eea014a04f6) · @rogerantony-dev



#### 📔 Documentation Changes

- **`gotchas`** 📝 add release pipeline learnings — [`921bc8a`](https://github.com/timelessco/recollect/commit/921bc8a89c3d8e8ccebd6101499899f7fd3ac393) · @navin-moorthy

- **`gotchas`** 📝 update release label behavior — [`273d600`](https://github.com/timelessco/recollect/commit/273d600a5911502de7545d099cf04aeb183d74e3) · @navin-moorthy

- **`gotchas`** clarify backmerge verification behavior and root cause — [`047cb93`](https://github.com/timelessco/recollect/commit/047cb93f1bee799c2b693afeeac4073ebf189bab) · @navin-moorthy

- **`release`** 📝 add Slack notification step to release skill — [`646e5f2`](https://github.com/timelessco/recollect/commit/646e5f21c19cdcca5fead899afff04698731835f) · @navin-moorthy

- **`release`** 📝 finalize Slack notification format — [`1fe9be2`](https://github.com/timelessco/recollect/commit/1fe9be25f80eea035529dd1a07d5f7c02a9c8635) · @navin-moorthy

- **`release`** 📝 update skill with session learnings — [`4175675`](https://github.com/timelessco/recollect/commit/4175675df86bffd65e3b9b3e8afc9fc698c51478) · @navin-moorthy



#### 💚 CI Changes

- **`release`** 🔔 add Slack notification on GitHub Release — [`cb0ae39`](https://github.com/timelessco/recollect/commit/cb0ae39b4183bd5b7097feb5a2439787a5314413) · @navin-moorthy, closes [#recollect-dev](https://github.com/timelessco/recollect/issues/recollect-dev)




- 🚀 Release v0.3.0 — [`125c1e7`](https://github.com/timelessco/recollect/commit/125c1e7d5f24e7a0a2214dd20684272a26d93133) · @navin-moorthy



</details>

## 0.3.0 (2026-03-19)

### 👀 Notable Changes


#### `release` — 📋 post API changelog as PR comment

> <sub>- Post docs/API_CHANGELOG.md as a PR comment during release - Clear the file during backmerge (CI cleanup + local fallback) - Skip comment when file is empty or missing</sub>

<sub>Introduced in [`68bbd3b7`](https://github.com/timelessco/recollect/commit/68bbd3b78d3329db782e794993ac662946ee1ca0)</sub>




<details>
<summary>🗃️ Commits</summary>



#### ⭐ New Features

- **`release`** 📋 post API changelog as PR comment — [`68bbd3b`](https://github.com/timelessco/recollect/commit/68bbd3b78d3329db782e794993ac662946ee1ca0) · @navin-moorthy



</details>

## 0.2.0 (2026-03-19)

### 👀 Notable Changes


#### `release` — 🤖 add --yes flag and /release skill

> <sub>- Add --yes/-y flag to release-pr.sh for non-interactive execution - Add release:pr:yes script to package.json - Create /release skill for full pipeline automation</sub>

<sub>Introduced in [`4f5a43eb`](https://github.com/timelessco/recollect/commit/4f5a43eb16a671e598618bdfd36f08cd45f1d927)</sub>


---


#### `release` — 🐛 use PAT to bypass branch protection

> <sub>- GITHUB_TOKEN can't push to protected main branch - Use ACCESS_TOKEN (admin PAT) for checkout and release - Bypasses PR requirement and Vercel status check</sub>

<sub>Introduced in [`ba6a9993`](https://github.com/timelessco/recollect/commit/ba6a99932fa75ee5ecf1009e8359c70ab6787850)</sub>




<details>
<summary>🗃️ Commits</summary>



#### ⭐ New Features

- **`release`** 🤖 add --yes flag and /release skill — [`4f5a43e`](https://github.com/timelessco/recollect/commit/4f5a43eb16a671e598618bdfd36f08cd45f1d927) · @navin-moorthy



#### 🐞 Bug Fixes

- **`release`** 🐛 use PAT to bypass branch protection — [`ba6a999`](https://github.com/timelessco/recollect/commit/ba6a99932fa75ee5ecf1009e8359c70ab6787850) · @navin-moorthy



#### 📔 Documentation Changes

- **`gotchas`** fix release pipeline step order and document --yes flag — [`4f31530`](https://github.com/timelessco/recollect/commit/4f31530ccc2b3159f25212d4b973216b1435d99b) · @navin-moorthy



#### 💚 CI Changes

- **`release`** 🔒 restore release guard after successful test — [`6b44af0`](https://github.com/timelessco/recollect/commit/6b44af005b5cb785642411329aa204cdc8761d52) · @navin-moorthy

- **`release`** 🔒 restore release guard after successful test — [`86d6f8d`](https://github.com/timelessco/recollect/commit/86d6f8da73b63e8698e35c6ade4bf973051f716b) · @navin-moorthy



#### 🎨 Code Style Changes

- **`release`** 💄 use smaller body text in changelog — [`b657bc0`](https://github.com/timelessco/recollect/commit/b657bc0cee9efebaee97e19e4eecf54495e86f66) · @navin-moorthy



</details>

## <small>0.1.3 (2026-03-19)</small>

### 👀 Notable Changes


#### `release` — 🐛 use PAT to bypass branch protection

> - GITHUB_TOKEN can't push to protected main branch - Use ACCESS_TOKEN (admin PAT) for checkout and release - Bypasses PR requirement and Vercel status check
<sub>Introduced in [`ba831658`](https://github.com/timelessco/recollect/commit/ba83165884da74ac61fd65fe61852a45c56b08d2)</sub>


---


#### `release` — 🐛 unwrap hard-wrapped commit body in changelog

> Git convention wraps commit bodies at 72 characters. These hard line breaks flowed directly into the changelog, causing body text to render with visible breaks instead of flowing prose.
> 
> Join single newlines into spaces while preserving intentional paragraph breaks (double newlines) so changelog body text reads as continuous paragraphs in both raw markdown and rendered HTML.
<sub>Introduced in [`d26624f9`](https://github.com/timelessco/recollect/commit/d26624f94a5f58351a226efae01b479c28bca62b)</sub>




### 📌 Other Notable Changes


#### `claude` — 📝 add release pipeline gotchas

> - GITHUB_TOKEN requirement for changelog writer - release-pr.sh handles existing release PRs gracefully
<sub>Introduced in [`21b32bfc`](https://github.com/timelessco/recollect/commit/21b32bfcf69f6d2ea1b3edd5c51a01f131f504ff)</sub>


---


#### `claude` — 📝 add release pipeline learnings to rules

> - Add release:pr, release:pr:dryrun, release:cleanup to commands - Add gotchas: v10 whatBump bug, prettier file targeting,   bash 3.2 compat, release label, pipeline flow
<sub>Introduced in [`2ed37433`](https://github.com/timelessco/recollect/commit/2ed3743337ebef002755d2f8e31b7979a4da062a)</sub>




<details>
<summary>🗃️ Commits</summary>



#### 🐞 Bug Fixes

- **`release`** 🐛 unwrap hard-wrapped commit body in changelog — [`d26624f`](https://github.com/timelessco/recollect/commit/d26624f94a5f58351a226efae01b479c28bca62b) · @navin-moorthy

- **`release`** 🐛 use PAT to bypass branch protection — [`ba83165`](https://github.com/timelessco/recollect/commit/ba83165884da74ac61fd65fe61852a45c56b08d2) · @navin-moorthy



#### 📔 Documentation Changes

- **`claude`** 📝 add release pipeline gotchas — [`21b32bf`](https://github.com/timelessco/recollect/commit/21b32bfcf69f6d2ea1b3edd5c51a01f131f504ff) · @navin-moorthy

- **`claude`** 📝 add release pipeline learnings to rules — [`2ed3743`](https://github.com/timelessco/recollect/commit/2ed3743337ebef002755d2f8e31b7979a4da062a) · @navin-moorthy



#### 💚 CI Changes

- **`release`** 🤖 automate release and cleanup in CI — [`39df5e0`](https://github.com/timelessco/recollect/commit/39df5e036326122094114c7fcef716c217523832) · @navin-moorthy

- **`release`** 🧪 temporarily remove release guard for testing — [`1d6cfe9`](https://github.com/timelessco/recollect/commit/1d6cfe914a787e229823742bc82fc728b45f4b63) · @navin-moorthy



</details>

## <small>0.1.2 (2026-03-19)</small>

### 👀 Notable Changes

#### `release` — 🐛 fix commit template formatting

> Align with next-ts-app-template: list marker on same line as
> scope, spaces instead of tabs for indentation. Fixes entries
> rendering with dash on its own line.

<sub>Introduced in [`7d90e246`](https://github.com/timelessco/recollect/commit/7d90e24615bdf67aeabf4f38976425e1b00c66e5)</sub>

---

#### `release` — 🐛 handle existing release branch gracefully

> Instead of erroring when a release/\* branch exists, detect
> the open PR and offer to delete and recreate it.
> <sub>Introduced in [`d2235a0d`](https://github.com/timelessco/recollect/commit/d2235a0df759b81529e2c18498f0ffdef83229ce)</sub>

---

#### `release` — 🐛 fix changelog formatting and after:bump hook

> - Format CHANGELOG.md with prettier (fixes CI lint failure)
> - Use pnpm exec prettier in after:bump hook (pnpm script
>   ignores the file argument)
>   <sub>Introduced in [`54237ae3`](https://github.com/timelessco/recollect/commit/54237ae36c0c18ef37c19181a08fe3b21914e07a)</sub>

<details>
<summary>🗃️ Commits</summary>

#### 🐞 Bug Fixes

- **`release`** 🐛 fix changelog formatting and after:bump hook — [`54237ae`](https://github.com/timelessco/recollect/commit/54237ae36c0c18ef37c19181a08fe3b21914e07a) · @navin-moorthy

- **`release`** 🐛 fix commit template formatting — [`7d90e24`](https://github.com/timelessco/recollect/commit/7d90e24615bdf67aeabf4f38976425e1b00c66e5) · @navin-moorthy

- **`release`** 🐛 handle existing release branch gracefully — [`d2235a0`](https://github.com/timelessco/recollect/commit/d2235a0df759b81529e2c18498f0ffdef83229ce) · @navin-moorthy

- **`release`** correct knip ignoreBinaries and commit template formatting — [`c036f34`](https://github.com/timelessco/recollect/commit/c036f34aa2a3f3ad2a978fa394f873bdbccf24de) · @navin-moorthy

#### 🔨 Maintenance Updates

- **`knip`** fix ignoreBinaries to reference prettier instead of CHANGELOG.md — [`fa6282c`](https://github.com/timelessco/recollect/commit/fa6282c158c95d6d501b75427a5e48937c41ed4a) · @navin-moorthy

#### 🎨 Code Style Changes

- **`release`** 💄 beautify changelog template output — [`216e202`](https://github.com/timelessco/recollect/commit/216e202f372cdf7ac48577abb0ff4679bae7306b)

</details>

## <small>0.1.1 (2026-03-19)</small>

### 🗃️ Commits

#### 🐞 Bug Fixes

- **`coderabbit:`** 🐛 use correct auto_review.labels path - [8586cf3](https://github.com/timelessco/recollect/commit/8586cf37dd1454c77feaeb459c45abf31b68b244) by @navin-moorthy

#### 🔨 Maintenance Updates

- **`deps:`** 🔧 pin @release-it/conventional-changelog below v10 - [4cefbce](https://github.com/timelessco/recollect/commit/4cefbcee59bc6b129e6afcc70e5f6c75b0115bca) by @navin-moorthy
- **`knip:`** 🔧 fix knip configuration hints - [1d8da17](https://github.com/timelessco/recollect/commit/1d8da17c24d94cfc2f5a93e0af8b6f3af32d914c) by @navin-moorthy
- **`release:`** 🔧 improve release pipeline CI integration - [6138e2f](https://github.com/timelessco/recollect/commit/6138e2f70772613b67ad7687b9d9dcd514b990b6) by @navin-moorthy

#### 🎨 Code Style Changes

- **`changelog:`** 💄 format CHANGELOG.md with prettier - [4e4c87f](https://github.com/timelessco/recollect/commit/4e4c87f61435b8eace179cf0a4e6b181e7251540) by @navin-moorthy

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
