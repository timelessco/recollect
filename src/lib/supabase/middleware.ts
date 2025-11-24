import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./constants";
import {
	ALL_BOOKMARKS_URL,
	isGuestPath,
	isPublicPath,
	LOGIN_URL,
} from "@/utils/constants";

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const pathname = request.nextUrl.pathname;

	// Skip authentication for public paths - allow anyone to view public collections
	if (isPublicPath(pathname)) {
		return supabaseResponse;
	}

	// With Fluid compute, don't put this client in a global environment
	// variable. Always create a new one on each request.
	const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value } of cookiesToSet) {
					request.cookies.set(name, value);
				}

				supabaseResponse = NextResponse.next({
					request,
				});
				for (const { name, value, options } of cookiesToSet) {
					supabaseResponse.cookies.set(name, value, options);
				}
			},
		},
	});

	// Do not run code between createServerClient and
	// supabase.auth.getClaims(). A simple mistake could make it very hard to debug
	// issues with users being randomly logged out.

	// IMPORTANT: If you remove getClaims() and you use server-side rendering
	// with the Supabase client, your users may be randomly logged out.
	const { data } = await supabase.auth.getClaims();
	const user = data?.claims;

	// Redirect authenticated users away from guest-only paths
	if (user && isGuestPath(pathname)) {
		const url = request.nextUrl.clone();
		url.pathname = `/${ALL_BOOKMARKS_URL}`;
		// Clear query & hash parameters
		url.search = "";
		url.hash = "";
		return NextResponse.redirect(url);
	}

	// Redirect unauthenticated users to login (unless already on a guest path)
	if (!user && !isGuestPath(pathname)) {
		const loginUrl = request.nextUrl.clone();
		loginUrl.pathname = `/${LOGIN_URL}`;

		if (!loginUrl.searchParams.has("next")) {
			loginUrl.searchParams.set("next", pathname);
		}

		return NextResponse.redirect(loginUrl);
	}

	// IMPORTANT: You *must* return the supabaseResponse object as it is.
	// If you're creating a new response object with NextResponse.next() make sure to:
	// 1. Pass the request in it, like so:
	//    const myNewResponse = NextResponse.next({ request })
	// 2. Copy over the cookies, like so:
	//    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
	// 3. Change the myNewResponse object to fit your needs, but avoid changing
	//    the cookies!
	// 4. Finally:
	//    return myNewResponse
	// If this is not done, you may be causing the browser and server to go out
	// of sync and terminate the user's session prematurely!

	return supabaseResponse;
}
