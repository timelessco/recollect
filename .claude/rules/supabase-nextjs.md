---
paths:
  - "src/lib/supabase/**"
  - "src/middleware.ts"
  - "src/utils/supabaseClient.ts"
  - "src/utils/supabaseServerClient.ts"
---

## Supabase Auth SSR

### CRITICAL: Deprecated Patterns

**NEVER use** — these break the application:

```typescript
// ❌ Individual cookie methods — BREAKS APPLICATION
{ cookies: { get(name) {...}, set(name, value) {...}, remove(name) {...} } }

// ❌ Deprecated package
import { createMiddlewareClient, createClientComponentClient } from "@supabase/auth-helpers-nextjs";
```

### REQUIRED: `@supabase/ssr` with `getAll`/`setAll`

#### Browser Client

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

#### Server Client

```typescript
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignore — called from Server Component
          }
        },
      },
    },
  );
}
```

#### Middleware

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const { data: { user } } = await supabase.auth.getUser();

  // Handle unauthenticated users...

  return supabaseResponse;
}
```

### Verification Checklist

Before generating any Supabase auth code:

1. Using ONLY `getAll` and `setAll`? ✓
2. Importing from `@supabase/ssr`? ✓
3. NO `get`, `set`, or `remove` methods? ✓
4. NO imports from `auth-helpers-nextjs`? ✓

**Consequences of wrong implementation:** breaks in production, fails to maintain session state, causes authentication loops, results in security vulnerabilities.

### Health Check Patterns

`getClaims()` does **NOT** make a network call — it validates the JWT locally (signature + expiration) from the cookie. A null result does not mean Supabase is unreachable.

To verify actual Supabase connectivity, use a network call:

```typescript
// getUser() makes a network request
const { data, error } = await supabase.auth.getUser();
// Or a direct fetch to the REST endpoint:
await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`);
```

**Service health checks must run for ALL paths** (including guest paths like `/login`), not just protected routes. A broken Supabase should return 500 everywhere.
