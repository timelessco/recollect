---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

## Zod + Supabase

- `z.looseObject` infers `{ [x: string]: unknown; ... }` — incompatible with Supabase's `Json` type. Use `z.object` for route handlers returning Supabase data
- In OpenAPI raw schema objects, do NOT use `as const` on `required` arrays — creates `readonly` tuple incompatible with `SchemaObject`'s `string[]`. Example data objects SHOULD use `as const`
- Prefer `z.int()` over `z.number().int()` — linter auto-transforms
- `z.iso.datetime()` rejects Supabase's `timestamptz` (`+00:00` offset) — use `z.string()` for output schemas. Only use `z.iso.datetime()` for input schemas where the client sends `Z`-suffix via `toISOString()`
- Never reference Zod internals in OpenAPI example descriptions — use tool-agnostic phrasing
- Integer DB columns (`id`, `category_id`) must use `z.int()` in output schemas, not `z.number()`
- Email input fields must use `z.email()`, not bare `z.string()`
- When porting v1 null-coalescing (`value ?? ""`), verify v1 actually uses `??` — don't add fallbacks that change behavior
- Supabase FK joins (`.select("fk_col(col1, col2)")`) return `null` when no match — `.filter()` before `.map()`. Prefer strict types, avoid unwanted optional `?.` checks
- When using Supabase `.like()`/`.ilike()` with user-derived strings, escape `%` and `_` wildcards before the query
