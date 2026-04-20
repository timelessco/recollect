---
paths:
  - "package.json"
  - "turbo.json"
  - "next.config.ts"
  - ".github/workflows/**"
---

## Build / Dev Gotchas

- `middleware.ts` is named `proxy.ts` — exports `proxy`, not `middleware`. (Also in `middleware.md` for file-scoped edits.)
- Check `lsof -iTCP:3000` before `pnpm dev` — may be running elsewhere.
- Before `pnpm dev`, confirm Supabase local up (`npx supabase status` or `lsof -iTCP:54321`). If dev server already on 3000, Supabase implicitly up — skip. Start via `pnpm db:start` if down.
- `build:ci` skips env/OpenAPI/sitemap — use `pnpm build` locally.
- No test suite — `pnpm test` exits 0 with "no test specified".
- CI runs lint only (no build gate); build failures surface on Vercel.
- `pnpm lint:ultracite` needs Next generated types. CI runs `pnpm next:typegen` first; `next dev`/`pnpm build` create them locally. Run `pnpm next:typegen` manually only if lint fails on missing types.
