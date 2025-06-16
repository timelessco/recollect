// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export const middleware = (request: NextRequest) => {
	const token = request.cookies.get("sb-fgveraehgourpwwzlzhy-auth-token")
		?.value;

	// If logged in, redirect from /login to /all-bookmarks
	if (token && request.nextUrl.pathname === "/login") {
		return NextResponse.redirect(new URL("/all-bookmarks", request.url));
	}

	return NextResponse.next();
};

// Apply middleware only on login page
export const config = {
	matcher: ["/login", "/signup"],
};
