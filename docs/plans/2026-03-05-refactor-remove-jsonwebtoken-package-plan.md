---
title: "refactor: Remove jsonwebtoken package, replace with database-stored invite tokens"
type: refactor
status: completed
date: 2026-03-05
---

## Overview

Remove `jsonwebtoken`, `jwt-decode`, and `@types/jsonwebtoken` from the project. Replace the JWT-based collaboration invite flow with a secure UUID token stored directly in the `shared_categories` table. Also remove the vestigial `VerifyErrors` type import from 15 legacy Pages Router files.

## Problem Statement

- `jsonwebtoken` has only **1 runtime usage** (`sign()` in `send-collaboration-email.ts`) and **15 type-only imports** (`VerifyErrors`) that are semantically incorrect (none of these routes verify JWTs)
- The invite token is signed with a **hardcoded secret** (`"shhhhh"`) — a security vulnerability
- The invite endpoint (`invite.ts`) uses `jwtDecode()` which **never verifies the signature**, making the signing step pointless
- Invite tokens **never expire**
- Three packages (`jsonwebtoken`, `jwt-decode`, `@types/jsonwebtoken`) exist for functionality that can be replaced with `crypto.randomUUID()` + a database column

## Proposed Solution

Replace the JWT invite token with a UUID stored in the `shared_categories` table. The invite URL becomes `/api/invite?token=<uuid>`, and the invite endpoint looks up the row directly by token instead of decoding a JWT.

## Technical Approach

### Phase 1: Database Migration

Add `invite_token` column to `shared_categories`:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_invite_token_to_shared_categories.sql
ALTER TABLE shared_categories
  ADD COLUMN invite_token UUID DEFAULT NULL;

CREATE UNIQUE INDEX idx_shared_categories_invite_token
  ON shared_categories (invite_token)
  WHERE invite_token IS NOT NULL;
```

- **Nullable**: existing rows (accepted invites) get `NULL` — they don't need tokens
- **Partial unique index**: ensures no duplicate tokens while allowing multiple `NULL` values
- Run `pnpm db:types` to regenerate types

### Phase 2: Update `send-collaboration-email.ts`

**File**: `src/pages/api/share/send-collaboration-email.ts`

1. Remove `import { sign, type VerifyErrors } from "jsonwebtoken"`
2. Generate UUID token: `const inviteToken = crypto.randomUUID()`
3. Include `invite_token: inviteToken` in the `.insert()` call (line 88-94)
4. Replace JWT URL construction (lines 109-118):

   ```typescript
   // Before
   const token = sign({ email, category_id, edit_access, userId }, "shhhhh");
   const url = `${hostUrl}/api/invite?token=${token}`;

   // After
   const url = `${hostUrl}/api/invite?token=${inviteToken}`;
   ```

5. Update the `Data` type to remove `VerifyErrors` from the error union:

   ```typescript
   // Before
   type Data = {
   	error: PostgrestError | VerifyErrors | string | null;
   	// ...
   };

   // After
   type Data = {
   	error: PostgrestError | string | null;
   	// ...
   };
   ```

### Phase 3: Update `invite.ts`

**File**: `src/pages/api/invite.ts`

1. Remove `import { jwtDecode } from "jwt-decode"`
2. Replace JWT decoding with direct database lookup by `invite_token`:

   ```typescript
   // Before
   const tokenData = jwtDecode(request?.query?.token as string);
   const { data, error } = await supabase
   	.from(SHARED_CATEGORIES_TABLE_NAME)
   	.select("*")
   	.eq("category_id", tokenData.category_id)
   	.eq("email", tokenData.email);

   // After
   const token = request?.query?.token as string;
   const { data, error } = await supabase
   	.from(SHARED_CATEGORIES_TABLE_NAME)
   	.select("*")
   	.eq("invite_token", token)
   	.maybeSingle();
   ```

3. On acceptance, clear the token for defense-in-depth:

   ```typescript
   .update({ is_accept_pending: false, invite_token: null })
   ```

4. Add `else` branch for missing token (currently silently returns nothing):

   ```typescript
   if (!request?.query?.token) {
   	response
   		.status(400)
   		.json({ success: null, error: "Missing invite token" });
   	return;
   }
   ```

5. Remove the `InviteTokenData` type (no longer needed)

### Phase 4: Remove `VerifyErrors` from 15 Pages Router Files

Mechanical change in each file — remove the import and simplify the error union type:

```typescript
// Before
import { type VerifyErrors } from "jsonwebtoken";
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

// After
type ErrorResponse = PostgrestError | string | null;
```

**Files** (all in `src/pages/api/`):

1. `share/update-shared-category-user-role.ts`
2. `share/fetch-shared-categories-data.ts`
3. `profiles/fetch-user-profile-pic.ts`
4. `profiles/remove-profile-pic.ts`
5. `profiles/delete-user.ts`
6. `profiles/fetch-user-profile.ts`
7. `tags/fetch-user-tags.ts`
8. `file/upload-file.ts`
9. `v1/tests/file/post/upload.ts`
10. `bookmark/add-bookmark-min-data.ts`
11. `bookmark/add-remaining-bookmark-data.ts`
12. `bookmark/fetch-bookmarks-view.ts`
13. `bookmark/add-url-screenshot.ts`
14. `bookmark/search-bookmarks.ts`
15. `bookmark/fetch-bookmarks-data.ts`

### Phase 5: Remove Packages

```bash
pnpm remove jsonwebtoken jwt-decode @types/jsonwebtoken
```

### Phase 6: Update V2 Share Route Schemas (if needed)

Check whether `invite_token` leaks into API responses. If the v2 share endpoints use `select("*")`, either:

- Switch to explicit column lists that exclude `invite_token`, OR
- Ensure the Zod output schemas strip it via `.omit()` or by not including it

**Files to check**:

- `src/app/api/v2/share/fetch-shared-categories-data/schema.ts`
- `src/app/api/v2/share/delete-shared-categories-user/schema.ts`
- `src/app/api/v2/share/update-shared-category-user-role/schema.ts`

### Phase 7: Verification

```bash
pnpm fix            # Auto-fix lint/format
pnpm lint:types     # TypeScript strict checks
pnpm build          # Verify build
pnpm check:packages # Check for duplicate deps
pnpm lint:knip      # Detect unused deps/exports
```

## Acceptance Criteria

- [x] `jsonwebtoken`, `jwt-decode`, and `@types/jsonwebtoken` removed from `package.json`
- [x] No imports of `jsonwebtoken` or `jwt-decode` remain in the codebase
- [x] `shared_categories` table has `invite_token UUID` column with partial unique index
- [x] Collaboration invite flow works: send invite → click link → accept
- [x] `invite_token` is cleared after acceptance
- [x] `invite_token` is not exposed in frontend API responses
- [x] `pnpm build` passes
- [x] `pnpm lint:types` passes

## Out of Scope (Follow-ups)

- Token expiration (`expires_at` column) — matches current behavior (no expiry)
- Invite endpoint auth check (verify recipient email matches logged-in user)
- RLS policy tightening on `shared_categories`
- Rate limiting on invite endpoints
- `axios` → `fetch` migration in `send-collaboration-email.ts`
- Backward compatibility for in-flight JWT invite links (low risk — collaboration invites are low-volume, and pending invites can be re-sent by the owner)

## References

- `src/pages/api/share/send-collaboration-email.ts` — sole runtime usage of `sign()`
- `src/pages/api/invite.ts` — invite acceptance endpoint
- `src/pages/api/share/send-email.ts` — email sending endpoint (unchanged)
- `supabase/migrations/20251105181644_prod_schema.sql:727-736` — current `shared_categories` schema
