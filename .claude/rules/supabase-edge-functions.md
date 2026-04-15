---
paths:
  - "supabase/functions/**"
---

## Supabase Edge Functions

### Guidelines

1. **Prefer Web APIs and Deno core APIs** over external deps (use WebSockets API instead of node-ws)
2. **Shared utilities** → `supabase/functions/_shared`, imported via relative paths. NO cross-dependencies between Edge Functions
3. **Import specifiers** — NO bare: `npm:@supabase/supabase-js` ✓, `@supabase/supabase-js` ✗
4. **Version all external imports**: `npm:express@4.18.2` ✓, `npm:express` ✗
5. **Prefer `npm:` and `jsr:`** over `deno.land/x`, `esm.sh`, `unpkg.com`
6. **Node built-in APIs** — use `node:` specifier: `import process from "node:process"`
7. **Use `Deno.serve`** — NOT deprecated `serve` from std
8. **Pre-populated env vars** (don't set manually): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (legacy name; upstream renamed to `SUPABASE_PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
9. **File writes** — ONLY `/tmp` directory allowed
10. **Background tasks** — use `EdgeRuntime.waitUntil(promise)`
11. **Deno Edge Functions cannot use Zod** — manual type guards only. Zod is available in Next.js API routes but NOT in `supabase/functions/`
12. **Edge Runtime uses an older Deno version** that cannot read lockfile v5 — fix is `lock: false` in `deno.json`. Do NOT delete the lockfile as a workaround

### Example Function

```typescript
interface ReqPayload {
  name: string;
}

console.info("server started");

Deno.serve(async (req: Request) => {
  const { name }: ReqPayload = await req.json();
  return new Response(JSON.stringify({ message: `Hello ${name}!` }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Using npm Packages

```typescript
import express from "npm:express@4.18.2";

const app = express();
app.get(/(.*)/, (req, res) => res.send("Welcome to Supabase"));
app.listen(8000);
```

### Using Node APIs

```typescript
import { randomBytes } from "node:crypto";
import process from "node:process";

const randomString = randomBytes(10).toString("hex");
console.log(randomString);
```
