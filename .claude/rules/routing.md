---
paths:
  - "src/pages/**"
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
  - "proxy.ts"
  - "src/utils/constants.ts"
---

## Routing Gotchas

- `src/pages/[category_id].tsx` catches ALL single-segment paths — new App Router pages at `/foo` 404 in dev because Pages dynamic routes take precedence
- New public pages must be added to `PUBLIC_PATHS` in `src/utils/constants.ts` — otherwise `proxy.ts` treats them as auth-protected
- `/discover` is blank without JS: `[category_id].tsx` gates render on `useMounted()`; `getServerSideProps` fetches but the component doesn't SSR-render — search engines see empty page
