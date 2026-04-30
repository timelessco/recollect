---
paths:
  - "src/env/**"
  - "src/lib/supabase/constants.ts"
  - "src/utils/supabaseClient.ts"
  - "src/site-config.ts"
  - "src/env/process-env.d.ts"
---

## Env Gotchas

- `src/lib/supabase/constants.ts`, `src/utils/supabaseClient.ts`, and `src/site-config.ts` mix `NEXT_PUBLIC_*` + server vars, imported from both contexts — can't fully migrate to `@/env/*`. `NEXT_PUBLIC_*` -> `@/env/client`; server vars stay as `process.env` with comment
- `process.env.X` is `string | undefined` by default — use `env.X` from `@/env/server`/`@/env/client` for typed access. `src/env/process-env.d.ts` is load-bearing: augments raw `process.env` for shared files that can't import `@/env/server`. Removing cascades `string | undefined` -> Supabase client `any` -> mass `no-unsafe-*` failures
