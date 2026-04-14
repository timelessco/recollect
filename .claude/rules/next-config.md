---
paths:
  - "next.config.ts"
  - "next.config.*.ts"
---

## Next.js Config

- Experimental flags (`prefetchInlining`, `appNewScrollHandler`, `sri`) — check Next docs before adding/removing
- Error boundaries (`error.tsx`, `global-error.tsx`) use `unstable_retry()` from `next/error` (not `reset()`) — re-fetches RSC data on retry
- Custom image loader: `src/utils/cloudflareImageLoader.ts` (not Next default optimizer)
- `typescript.ignoreBuildErrors: true` — TS errors do NOT fail production builds
- `next build` v16 hard-fails if config has `webpack` key without `turbopack` key — Turbopack is default

### Sentry (Turbopack era)

- Tunnel via `/skynet` bypasses ad-blockers
- `webpack.*` opts irrelevant — Turbopack-only. `bundleSizeOptimizations` (top-level) works for both bundlers via the shared Sentry plugin
- Component annotation: `_experimental.turbopackReactComponentAnnotation` (not deprecated top-level `reactComponentAnnotation` or `webpack.reactComponentAnnotation`)
- `useRunAfterProductionCompileHook` (default `true` on Turbopack) injects Debug IDs post-compile — conflicts with `experimental.sri`; set `false` when SRI enabled
