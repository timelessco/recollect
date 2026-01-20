---
paths: supabase/functions/**
---

# Supabase Edge Functions

## Guidelines

1. **Prefer Web APIs and Deno core APIs** over external dependencies
   - Use `fetch` instead of Axios
   - Use WebSockets API instead of node-ws

2. **Shared utilities** go in `supabase/functions/_shared`
   - Import using relative paths
   - NO cross-dependencies between Edge Functions

3. **Import specifiers** - NO bare specifiers
   - ❌ `@supabase/supabase-js`
   - ✅ `npm:@supabase/supabase-js`

4. **Version all external imports**
   - ❌ `npm:express`
   - ✅ `npm:express@4.18.2`

5. **Prefer `npm:` and `jsr:`** over `deno.land/x`, `esm.sh`, `unpkg.com`

6. **Node built-in APIs** - use `node:` specifier
   - `import process from "node:process"`

7. **Use `Deno.serve`** - NOT deprecated `serve` from std
   - ❌ `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"`
   - ✅ `Deno.serve(async (req) => { ... })`

8. **Pre-populated environment variables** (don't set manually):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_OR_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_URL`

9. **File writes** - ONLY `/tmp` directory allowed

10. **Background tasks** - use `EdgeRuntime.waitUntil(promise)`

## Example Function

```typescript
interface ReqPayload {
	name: string;
}

console.info("server started");

Deno.serve(async (req: Request) => {
	const { name }: ReqPayload = await req.json();
	const data = {
		message: `Hello ${name}!`,
	};

	return new Response(JSON.stringify(data), {
		headers: { "Content-Type": "application/json" },
	});
});
```

## Using npm Packages

```typescript
import express from "npm:express@4.18.2";

const app = express();

app.get(/(.*)/, (req, res) => {
	res.send("Welcome to Supabase");
});

app.listen(8000);
```

## Using Node APIs

```typescript
import { randomBytes } from "node:crypto";
import process from "node:process";

const randomString = randomBytes(10).toString("hex");
console.log(randomString);
```
