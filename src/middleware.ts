// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

import { ALL_BOOKMARKS_URL } from "./utils/constants";

export const middleware = (request: NextRequest) => {
	const token = request.cookies.get(process.env.AUTH_COOKIE_SECRET ?? "")
		?.value;

	// If logged in, redirect from /login to /all-bookmarks
	if (token) {
		return NextResponse.redirect(new URL(`/${ALL_BOOKMARKS_URL}`, request.url));
	}

	return NextResponse.next();
};

// Apply middleware only on login page
export const config = {
	matcher: ["/login", "/signup"],
};
