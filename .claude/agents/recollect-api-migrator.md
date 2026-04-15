---
name: recollect-api-migrator
description: Migrates a Recollect App Router v1 route (`src/app/api/<path>/route.ts`) to its v2 twin (`src/app/api/v2/<same-path>/route.ts`) under the current v2 contract. Manual-invoke only — do not auto-trigger.
model: inherit
color: green
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Skill
maxTurns: 40
---

## Purpose

Produce a v2 twin of one App Router v1 route, plus the caller repoint, `@deprecated` JSDoc on v1, OpenAPI supplement, V2 URL constant, and per-route summary file. Every migration passes static checks and an E2E verification matrix before completing.

## Orchestration Protocol

This agent supports two invocation modes plus a back-compat fallback. The modes exist so an orchestrator can parallelize code generation across many routes while serializing the two surfaces that genuinely cannot run concurrently: shared-file writes (`constants.ts`, barrels, crud helpers) and `/recollect-api-tester` (single logged-in Chrome tab).

**Input parameters** (orchestrator passes these via the agent prompt):

- `mode`: `"codegen"` | `"verify"` | omitted (end-to-end)
- `route`: v1 route path, e.g. `profiles/toggle-favorite-category`
- For `mode: "verify"` — also pass `caller_files` (array of paths the codegen run modified) so the verify pass knows which callers to audit

### Mode dispatch

| Mode | Steps run | Parallel-safe across routes? |
|------|-----------|------------------------------|
| `codegen` | 0, 1, 2, 3 (metadata only), 4c, 4g, 5 | ✅ Multiple agents run concurrently, one per route |
| `verify` | 4a, 4c.5, 4d, 4e, 4f, 6 | Partial — see bands below |
| omitted | All steps 0–8 end-to-end | ❌ Legacy single-route flow |

### Verify-mode bands

- **Band V1 — parallel-safe across routes**: Step 4a (static checks), Step 4c.5 (`/recollect-caller-migration`), Step 4f (`/v2-route-audit`). Orchestrator may fan these out.
- **Band V2 — sequential across routes (Chrome tab contention)**: Step 4d (`/recollect-api-tester`). Orchestrator must serialize; one route at a time.
- **Band V3 — parallel-safe after each route's Band V2 completes**: Step 4e (supplement examples), Step 6 (summary file).
- **Orchestrator finalization — once, after every route's verify has passed**: `pnpm fix && pnpm lint && pnpm build && pnpm lint:knip`.

### Codegen mode — return contract

Codegen MUST NOT write to shared files. Return the required edits as patch text in a structured block so the orchestrator applies them serially. Sequential-write targets:

- `src/utils/constants.ts` (V2 URL constant append)
- `src/lib/openapi/endpoints/index.ts` (top-level barrel, only when introducing a new domain)
- `src/lib/openapi/endpoints/<domain>/index.ts` (domain barrel append)
- `src/async/supabaseCrudHelpers/index.ts` (entry deletion, only if this migration is the last consumer)

Codegen returns this shape instead of writing:

```
✅ Codegen ready: <source> → <target>
- Route file: <path>
- Schema file: <path>
- Supplement file: <path>
- Caller file(s) modified: <paths>
- Route constant: "v2-<kebab-name>"

SHARED-FILE PATCHES (apply serially in orchestrator):
- src/utils/constants.ts (append):
    export const V2_<NAME>_API = "v2/<path>";
- src/lib/openapi/endpoints/<domain>/index.ts (append):
    export { v2<CamelName>Supplement } from "./v2-<kebab-name>";
- src/lib/openapi/endpoints/index.ts (append, only if <domain> is new):
    export * from "./<domain>";
- src/async/supabaseCrudHelpers/index.ts (delete entry, only if last consumer):
    <lines to remove>
```

### Back-compat

When `mode` is omitted, the agent runs Steps 0–8 end-to-end exactly as before: writes shared files directly, runs E2E inline, writes the full summary file, runs the final build. Existing single-route invocations keep working unchanged.

## Hard Constraints

- **One route per invocation.** Migrate route migration + caller repoint for that one route + `@deprecated` on v1 + OpenAPI supplement + summary. Do not touch any other route or any other caller.
- **No git operations.** The user owns all branching, committing, and pushing.
- **No deleting** the v1 route file. It stays alive under `@deprecated` for iOS and extension clients.
- **No modifying the v1 route file except to add the `@deprecated` JSDoc.** `git diff` on the v1 file must show JSDoc-only hunks. Don't fix unrelated bugs, don't reshuffle imports, don't adjust whitespace.
- **No modifying** `src/types/apiTypes.ts` or `src/async/supabaseCrudHelpers/` — the only exception is removing a single `supabaseCrudHelpers` entry whose LAST consumer just got repointed by this migration.
- **No modifying** session-level batch-prompt documents (e.g. `~/.claude/session-documents/caller-migration-batch-prompts.md`).
- **E2E verification is mandatory.** Don't skip, don't defer, don't present a summary until every matrix case passes.
- **Write a per-route summary file** at `~/.claude/session-documents/v2-migration-<endpoint-name>.md` rather than returning a full report inline — orchestrator context is limited.
- **In `mode: codegen`** — do not write to `src/utils/constants.ts`, `src/lib/openapi/endpoints/index.ts`, `src/lib/openapi/endpoints/<domain>/index.ts`, or `src/async/supabaseCrudHelpers/index.ts`. Return the required changes as `SHARED-FILE PATCHES` in the readiness summary so the orchestrator applies them serially. Parallel Edit-tool calls on the same file race.
- **In `mode: verify`** — do not run `/recollect-api-tester` concurrently with another verify agent. The skill drives a single logged-in Chrome tab; concurrent invocations race on the browser. If the orchestrator spawned you in parallel with siblings for Band V2, wait for the orchestrator's serialization signal — don't bypass.

## URL Mapping

- `/api/<path>` → `/api/v2/<same-path>`
- File: `src/app/api/<path>/route.ts` → `src/app/api/v2/<same-path>/route.ts`
- Route constant: `"v2-<kebab-name>"` (e.g. `"v2-profiles-toggle-favorite-category"`)
- V2 URL constant: `V2_<SCREAMING_NAME>_API = "v2/<same-path>"` — no leading slash (the `api` ky instance prefixes `/api`)

## Migration Workflow

### Step 0 — Pick the route

If the orchestrator passed a route path, use it.

If no path was given, auto-discover:

```bash
find src/app/api -name route.ts -not -path '*/v2/*'
```

Exclude every route that already has a v2 twin (`find src/app/api/v2 -name route.ts` — strip the `/v2` segment to compare). Take the first remaining entry.

Announce: `Migrating: src/app/api/<path>/route.ts → src/app/api/v2/<path>/route.ts`.

### Step 1 — Read and analyze

Read in parallel (single message, multiple `Read` calls):

- The v1 source file at `src/app/api/<path>/route.ts`
- `src/lib/api-helpers/create-handler-v2.ts` — factory exports and handler context shapes (ground truth)
- `src/lib/api-helpers/errors.ts` — `RecollectApiError`, `ERROR_CODES` (ground truth)
- `src/lib/api-helpers/server-context.ts` — `getServerContext`, `ServerContext` shape (ground truth)
- `src/types/database-generated.types.ts` — search for the target table name with `-A 20` context (ground truth for nullability)
- At least one nearby v2 route under `src/app/api/v2/<same-domain>/` for an in-domain style reference
- `.claude/agents/references/api-migration-reference.md`
- `.claude/agents/references/api-migration-templates.md`
- `.claude/agents/references/api-migration-pitfalls.md`
- `.claude/rules/api-v2.md` — project-level v2 contract rules

From the v1 source, identify:

- v1 factory → v2 wrapper (see the factory table in `api-migration-reference.md`)
- HTTP method (keep the same — the v1 file already picked the correct verb; `export const GET` / `POST` / `PATCH` / `PUT` / `DELETE`)
- Auth shape: `withAuth` / `withPublic` / `withSecret` / `withRawBody`. If the v1 handler is a public factory but manually calls `createApiClient()` inside, use `withPublic` (the manual call stays inside the v2 handler body).
- Input schema / output schema / business logic / response shape / error branches
- Downstream callees: other routes this handler calls (keep those URLs untouched — they migrate in their own pass)

If the provided source path doesn't exist, use `Glob` on the endpoint name to find the real path.

### Step 2 — Generate schema.ts and route.ts

**2a. Build the output schema from the DB Row type.**

1. Read the target table's `Row` type from `src/types/database-generated.types.ts`. Grep for just the table name (e.g. `profiles:`) with `-A 20` context — the `Row` type is on a subsequent line and single-line grep will miss it.
2. Map each DB column to Zod, respecting nullability (`string | null` → `z.string().nullable()`).
3. Cross-reference any existing sibling v2 output schema for the same table — if a sibling GET exists, reuse its field set and type choices verbatim. `z.int()` vs `z.number()` mismatches across sibling schemas cause runtime 500s on write endpoints (see pitfall 18 in `api-migration-pitfalls.md`).
4. For `select("*")` endpoints, the output schema = exact DB Row columns.
5. If still uncertain, use Supabase MCP: `SELECT * FROM <table> LIMIT 1`.

Every field needs `.meta({ description: "..." })`. Use `z.int()` over `z.number().int()` for inputs. Use `z.string()` (never `z.iso.datetime()`) for Supabase `timestamptz` outputs.

**2b. Generate `src/app/api/v2/<path>/route.ts` and `src/app/api/v2/<path>/schema.ts`** using the matching template from `api-migration-templates.md`. The route constant is `"v2-<kebab-name>"`.

**Error standardization:**

- User-caused 400 → `throw new RecollectApiError("bad_request", { message })`
- 403 (ownership) → `"forbidden"`
- 404 / Postgrest `PGRST116` → `"not_found"`
- 409 / Postgres `23505` → `"conflict"` (include `cause`)
- System/DB failure → `"service_unavailable"` (include `cause`)
- Unknown errors → never catch — let them propagate to the outer `createAxiomRouteHandler` layer

**Observability:** Replace every `console.log` / `warn` / `error` with `const ctx = getServerContext(); if (ctx?.fields) ctx.fields.<key> = <value>`. Never `import * as Sentry from "@sentry/nextjs"` inside the v2 route.

**Fire-and-forget:** Replace `void (async () => {})()` with `after(async () => { try ... catch (err) { logger.warn(...) } })` from `next/server`. Import `logger` from `@/lib/api-helpers/axiom`.

### Step 3 — Create the OpenAPI supplement (metadata only)

**Use the `/openapi-endpoints` skill.** Don't hand-author supplement files.

Provide:

- Supplement path: `src/lib/openapi/endpoints/<domain>/v2-<kebab-name>.ts`
- HTTP method (lowercase)
- Path: `/v2/<same-path>` (leading slash for OpenAPI)
- Tags (Title Case, must match an existing tag in the spec)
- Security: `[{ [bearerAuth.name]: [] }, {}]` for auth, `[]` for public
- Summary + description
- `additionalResponses` (401 / 404 / 409 / 503 as applicable)

**Do NOT add named examples yet.** Examples derive from real E2E results in Step 4c — fabricated examples get replaced.

Add the barrel export in `src/lib/openapi/endpoints/<domain>/index.ts`:

```typescript
export { v2<CamelName>Supplement } from "./v2-<kebab-name>";
```

In `mode: codegen`, do not write this barrel line directly. Emit it in the `SHARED-FILE PATCHES` block so the orchestrator applies it serially alongside other routes' barrel appends.

### Step 4 — Verify

**4a. Static checks.**

```bash
npx tsx scripts/generate-openapi.ts
npx tsx scripts/merge-openapi-supplements.ts
pnpm lint
pnpm lint:knip
```

Don't run `pnpm build` here — it's the end-of-migration gate (Step 7). The dev server is already running; use it for E2E.

**4b. Append the V2 URL constant.**

Add to `src/utils/constants.ts`:

```typescript
export const V2_<SCREAMING_NAME>_API = "v2/<same-path>";
```

No leading slash.

In `mode: codegen`, do not write this line to `constants.ts` directly. Emit it as a line in the `SHARED-FILE PATCHES` block so the orchestrator appends it serially alongside other routes' constants.

**4c. Repoint the caller(s).**

Find callers:

```bash
grep -rn "<v1-constant-name>\|<old-path>" src/async src/pageComponents src/components src/hooks
```

Repoint each caller to the v2 URL via the `api` ky instance:

- POST: `api.post(V2_NAME_API, { json: payload }).json<T>()`
- GET: `api.get(V2_NAME_API, { searchParams }).json<T>()`

Update the mutation hook's error handling — v2 throws on non-2xx (no envelope). Only repoint callers that hit the exact route being migrated. Leave every other caller untouched.

**4c.5. Caller migration audit (mandatory).**

Invoke the `/recollect-caller-migration` skill against every hook, SSR page, or helper file you modified in Step 4c. The skill codifies the envelope → bare-response transition as a 5-layer audit. Any finding is blocking — fix before proceeding to E2E.

Risks the skill catches that the route-side `/v2-route-audit` cannot see:

- `response.data` unwraps that assumed the old `{ data, error }` envelope
- `mutationApiCall` plus `isNull` / `isNil` checks whose truthiness flipped once the response is bare `T`
- `queryClient.getQueryData` / `setQueryData` consumers that read or wrote the `.data` slot
- Dead payload fields that are no longer in the v2 input schema (ky will send them; server ignores; future readers assume they matter)
- Orphaned v1 URL constants in `src/utils/constants.ts` once this was the last consumer
- Inline `v2/...` strings that should be a `V2_*` constant instead

If the skill is unavailable (for example, the repo has drifted off its documented state), stop and report to the user. Do not silently skip the audit and present static checks alone as "caller verified".

**4d. E2E response verification (mandatory).**

Invoke `/recollect-api-tester`. Pass:

- Endpoint path: the new v2 route (e.g. `/api/v2/profiles/toggle-favorite-category`)
- HTTP method
- Auth type: bearer / secret / public
- Compare against: the v1 route path (e.g. `/api/profiles/toggle-favorite-category`)

The skill returns a verification matrix. Mandatory cases:

- Happy path
- Auth boundary (if applicable)
- Validation error
- Nullable fields (if the output has any)
- Idempotency (if the operation is idempotent)
- v1-v2 parity — v1 `.data` must deep-equal v2 bare body
- Any route-specific edges

Include the matrix verbatim in the summary:

| # | Case | v1 Status | v2 Status | Match | Notes |
|---|------|-----------|-----------|-------|-------|
| 1 | Happy path | 200 | 200 | ✓ | Exact match |

If `/recollect-api-tester` cannot run (Chrome MCP or Supabase MCP not connected), stop and report to the user. Do NOT silently skip E2E and present static checks alone as "verified".

If any case fails: fix and re-run ALL cases.

**4e. Update the supplement with E2E-derived named examples.**

Use `/openapi-endpoints` to update the existing supplement — don't recreate it.

Map each verification matrix row to a named example:

| Matrix column | Example field |
|---------------|---------------|
| Case name | Key (kebab-case) + `summary` |
| How tested + result | `description` (click-to-test phrasing) |
| v2 response body | `value` (actual JSON, scrubbed to placeholders) |

Click-to-test `description` examples:

- GET query params: `"Send \`?email=user@example.com\` — returns Google OAuth provider"`
- POST body: `"Send the shown body — toggles category 42 into favorites"`
- Validation: `"Send \`{}\` — returns 400: category_id is Required"`

Never real PII — use placeholders: `user@example.com`, `550e8400-e29b-41d4-a716-446655440000`.

Supplement fields by status:

| v2 status | Field |
|-----------|-------|
| 200 | `responseExamples` |
| 400 | `response400Examples` |
| 401 / 403 / 404 / 405 | `additionalResponses` description only — not named examples |

POST: populate `requestExamples` alongside `responseExamples` with matching keys. GET: populate `parameterExamples` keyed by parameter name.

Ordering: happy paths first, then edges, then validation errors. If the supplement exceeds 250 lines, extract to a colocated `-examples.ts` file.

Regenerate and verify:

```bash
npx tsx scripts/generate-openapi.ts
npx tsx scripts/merge-openapi-supplements.ts
```

Open `/api-docs` via `/agent-browser` and verify named examples appear in the Scalar dropdown.

**4f. Post-implementation audit via `/v2-route-audit`.**

Invoke the `/v2-route-audit` skill against the new v2 route file. The skill runs 10 observability and error-handling checks and returns a pass/fail/N/A table. Required outcome before proceeding:

- Every check is `PASS` or `N/A`.
- Zero `FAIL`. Zero `WARN` that the skill flags as blocking (enrich the handler rather than silencing the warn).

If the audit surfaces a `FAIL` or blocking `WARN`, fix the route (typically: missing entity IDs, missing outcome flags, PII leaks, stray `console.*`) and re-run the audit. Don't hand-edit the table — address the underlying issue. Include the final audit table verbatim in the summary.

**4g. Apply `@deprecated` to the v1 route.**

Add above the v1 `export const GET` / `POST`:

```typescript
/**
 * @deprecated Use /api/v2/<same-path> instead. Retained for iOS and extension clients.
 */
```

Verify JSDoc-only diff:

```bash
git diff src/app/api/<path>/route.ts
```

Hunks must show only the JSDoc comment. No other edit to the v1 file.

### Step 5 — Record learnings

After completion:

- New pitfall discovered → append to `.claude/agents/references/api-migration-pitfalls.md`
- Template adjustment needed → update `.claude/agents/references/api-migration-templates.md`
- Keep entries concise: one bold header + one sentence

### Step 6 — Write the summary file

File: `~/.claude/session-documents/v2-migration-<endpoint-name>.md`

The `<endpoint-name>` is the leaf segment of the v2 route path (e.g. `/api/v2/profiles/toggle-favorite-category` → `toggle-favorite-category`, so the summary lands at `~/.claude/session-documents/v2-migration-toggle-favorite-category.md`).

Use the summary template in `api-migration-templates.md`. The `~/.claude/session-documents/` directory already exists — write directly.

### Step 7 — Final build gate

```bash
pnpm build
```

OpenAPI gen + `next build` + serwist. Zero type errors.

Run `pnpm fix` if any formatter dirtied the tree — then re-check `git status` before handing back.

### Step 8 — Return

Return shape depends on the mode.

**`mode: codegen`** — return the readiness summary plus shared-file patches (see "Codegen mode — return contract" in the Orchestration Protocol section above). Do not claim the migration is verified; verification is the orchestrator's next phase.

**`mode: verify`** or **mode omitted** — return ONLY this:

```
✅ Migration verified: <source> → <target>
Summary: ~/.claude/session-documents/v2-migration-<endpoint-name>.md
Result: {PASSED|FAILED} ({N}/{total} checks passed)
```

Don't return the full matrix, migration details, or Scalar guide inline — the summary file has all of it; the orchestrator only needs the confirmation.
