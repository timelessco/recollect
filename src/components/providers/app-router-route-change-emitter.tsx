"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { emitRouteChange } from "@/lib/api-helpers/axiom-client-events";

/**
 * Emits `route_change` on every App Router pathname change. Mount inside
 * the App Router providers tree only — Pages Router navigations are
 * handled via `Router.events.on("routeChangeComplete")` in `_app.tsx`.
 *
 * The first pathname is not emitted: `session_start` already carried
 * `path_at_start`, so a leading duplicate `route_change` is redundant.
 */
export function AppRouterRouteChangeEmitter() {
  const pathname = usePathname();
  const lastPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) {
      return;
    }
    const previous = lastPathnameRef.current;
    lastPathnameRef.current = pathname;
    if (previous === null || previous === pathname) {
      return;
    }
    emitRouteChange(previous, pathname);
  }, [pathname]);

  return null;
}
