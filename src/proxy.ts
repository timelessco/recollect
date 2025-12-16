import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { isGuestPath, isPublicPath } from "./utils/constants";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
	try {
		const { pathname } = request.nextUrl;

		// If it's a public path, allow access
		if (isPublicPath(pathname)) {
			return NextResponse.next();
		}

		return await updateSession(request);
	} catch (error) {
		console.error("Proxy request error:", error);
		Sentry.captureException(error, {
			extra: { errorMessage: "Proxy request error" },
		});

		// On error, we need to determine if the path requires authentication
		const { pathname } = request.nextUrl;

		// If it's a public path or guest path (like login), allow access
		if (isPublicPath(pathname) || isGuestPath(pathname)) {
			return NextResponse.next();
		}

		// For protected routes, show an error page instead of allowing access
		// This prevents unauthorized access when auth system is down
		return NextResponse.rewrite(
			new URL(
				"/error?status=500&error=Service temporarily unavailable",
				request.url,
			),
		);
	}
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - sitemap.xml, robots.txt (metadata files)
		 * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
		 * - sw.js (service worker)
		 * - manifest.json, manifest.ts, manifest.webmanifest (PWA manifest files)
		 * - pwa (PWA assets directory)
		 * - /_vercel/.* (Vercel specific files)
		 * - .well-known (well-known files)
		 * - fonts (font files)
		 * - skynet (skynet files)
		 *
		 * IMPORTANT: Do NOT add "missing" headers configuration to exclude prefetch requests.
		 * Excluding prefetch headers (like "next-router-prefetch" or "purpose: prefetch")
		 * causes the middleware to skip authentication checks during client-side navigation.
		 * This results in protected pages briefly showing before redirects, breaking the
		 * authentication flow. The middleware must run for ALL navigation types to ensure
		 * proper access control.
		 */
		"/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)|sitemap.xml|sitemap-0.xml|robots.txt|sw.js|manifest.json|manifest.webmanifest|_vercel|.well-known|fonts|skynet$).*)",
	],
};
