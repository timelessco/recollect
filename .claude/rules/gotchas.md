## Gotchas

- `middleware.ts` is named `proxy.ts` — exports `proxy` function, not `middleware`
- Dev server is already running in another terminal — never run `pnpm dev`
- `pnpm fix` runs the full fix chain via Turbo dependency graph (`fix:spelling → fix:css → fix:md → fix:prettier → fix:eslint`)
- `build:ci` skips env validation, OpenAPI gen, and sitemap — use `pnpm build` for local verification
- `typescript.ignoreBuildErrors: true` in next.config — TS errors do NOT fail production builds
- `reactStrictMode` is disabled (commented out)
- `lint:types` also runs `deno check` for the Supabase Edge Function
- No test suite — `pnpm test` exits 0 with "no test specified". Cypress installed but no specs
- CI runs lint checks only (no build gate) — build failures surface on Vercel
- `prebuild:next` generates OpenAPI spec before every `next build`
- Custom image loader: `src/utils/cloudflareImageLoader.ts` (not Next.js default optimizer)
- Sentry tunnel: events proxied through `/skynet` to bypass ad-blockers
- `axios` is in dependencies but the rule is `fetch` only — legacy, do not use for new code
- Node engine: `^22.14.0 || >=24.0.0`
- cspell dictionary at `.cspell/project-words.txt` — `fix:spelling` wipes and rebuilds from scratch
- Commit body lines must be under 100 characters (`commitlint` enforces `body-max-line-length`)
