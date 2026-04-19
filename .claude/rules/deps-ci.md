---
paths:
  - ".ncurc.cjs"
  - "renovate.json"
  - ".github/workflows/**"
  - ".github/renovate.json"
---

## Dependencies / CI

- `.ncurc.cjs` pins packages that can't upgrade (mirrors `.github/renovate.json` blocks) — keep both in sync.
- GitHub Actions use pinned commit SHAs with version comments — get SHAs via `gh api repos/{owner}/{repo}/git/ref/tags/{tag}` when upgrading.
