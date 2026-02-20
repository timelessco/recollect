# Supabase Auth SSR with Next.js

## CRITICAL: Deprecated Patterns

**NEVER use these patterns - they will break the application:**

```typescript
// ❌ NEVER USE - Individual cookie methods
{
  cookies: {
    get(name: string) { ... },    // ❌ BREAKS APPLICATION
    set(name: string, value) { ... }, // ❌ BREAKS APPLICATION
    remove(name: string) { ... }  // ❌ BREAKS APPLICATION
  }
}

// ❌ NEVER USE - Deprecated package
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
```

## REQUIRED: Correct Patterns

**ALWAYS use `@supabase/ssr` with `getAll`/`setAll`:**

### Browser Client

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
	return createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
	);
}
```

### Server Client

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
						// Ignore - called from Server Component
					}
				},
			},
		},
	);
}
```

### Middleware

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
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Handle unauthenticated users...

	return supabaseResponse;
}
```

## Verification Checklist

Before generating any Supabase auth code:

1. Using ONLY `getAll` and `setAll`? ✓
2. Importing from `@supabase/ssr`? ✓
3. NO `get`, `set`, or `remove` methods? ✓
4. NO imports from `auth-helpers-nextjs`? ✓

## Consequences of Wrong Implementation

Using deprecated patterns will:

1. Break in production
2. Fail to maintain session state
3. Cause authentication loops
4. Result in security vulnerabilities

## Health Check Patterns

**getClaims() does NOT make a network call** — it validates the JWT locally (signature and expiration) from the cookie. A null result does not mean Supabase is unreachable.

To verify actual Supabase connectivity, use:

```typescript
// getUser() makes a network request
const { data, error } = await supabase.auth.getUser();
// Or a direct fetch to the REST endpoint:
await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`);
```

**Service health checks must run for ALL paths** (including guest paths like `/login`), not just protected routes. A broken Supabase should return 500 everywhere.
