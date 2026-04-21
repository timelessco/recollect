import type { GetStaticProps } from "next";
import type { ReactElement } from "react";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { SingleListData } from "../../types/apiTypes";
import type { NextPageWithLayout } from "../_app";

import { logger } from "@/lib/api-helpers/axiom-logger";
import { extractErrorFields } from "@/lib/api-helpers/errors";

import { useMounted } from "../../hooks/useMounted";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../lib/supabase/constants";
import Dashboard from "../../pageComponents/dashboard";
import { DiscoverGuestView } from "../../pageComponents/discover/DiscoverGuestView";
import { useSupabaseSession } from "../../store/componentStore";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "../../utils/constants";

interface DiscoverPageProps {
  discoverData: SingleListData[];
}

// Always render the guest view. The static HTML is what crawlers index and
// what the Dashboard layout briefly sits on top of for authenticated users
// (see getLayout below).
const Discover: NextPageWithLayout<DiscoverPageProps> = ({ discoverData }) => (
  <DiscoverGuestView discoverData={discoverData} />
);

// Synchronous Supabase auth-cookie sniff. Stays `false` on the server
// (no `document`) and flips true during first client render if the session
// cookie is present. Used to skip the guest-view flash for authed users
// before Zustand populates `session`.
function hasSupabaseAuthCookie(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return /(?:^|; )sb-[^=]+-auth-token=/.test(document.cookie);
}

// Client-side layout switcher. Before hydration and for guests this is a
// no-op (matches the static HTML). Once mounted, either the Zustand session
// or a live auth cookie triggers Dashboard to wrap the page — Dashboard
// reads `categorySlug` from the router and renders `DiscoverBookmarkCards`
// in the main pane, so `children` (the guest view) is intentionally
// discarded inside Dashboard.
const DiscoverLayoutSwitcher = ({ children }: { children: ReactElement }) => {
  const isMounted = useMounted();
  const session = useSupabaseSession((state) => state.session);
  const likelyAuthed = hasSupabaseAuthCookie();

  if (!isMounted || (!likelyAuthed && !session)) {
    return children;
  }

  return <Dashboard>{children}</Dashboard>;
};

Discover.getLayout = (page: ReactElement) => (
  <DiscoverLayoutSwitcher>{page}</DiscoverLayoutSwitcher>
);

// `getStaticProps` with on-demand ISR instead of `getServerSideProps`. The
// old getServerSideProps blocked SPA navigation on every authenticated click
// — the Pages
// Router waits for `/_next/data/<buildId>/discover.json` before transitioning
// — and on a cold Vercel invocation that was a 4-5s stall for authed users.
//
// The static page is pre-rendered at build time and revalidates every 60s,
// so the `_next/data` fetch is an edge-cache hit (~10-50ms) for every user
// including the first authenticated click. Authenticated users briefly see
// the guest HTML before the Zustand session hydrates and `Dashboard` mounts
// over the top (the cookie sniff in `DiscoverLayoutSwitcher` above keeps
// that flash to a single frame for the common signed-in case).
//
// Build/revalidation uses the plain `@supabase/supabase-js` client; no
// cookies are needed because every discoverable bookmark is public.
export const getStaticProps: GetStaticProps<DiscoverPageProps> = async () => {
  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const { data, error } = await supabase
      .from(MAIN_TABLE_NAME)
      .select(
        `
				id,
				inserted_at,
				title,
				url,
				description,
				ogImage,
				screenshot,
				trash,
				type,
				meta_data,
				sort_index,
				make_discoverable,
				user_id
`,
      )
      .is("trash", null)
      .not("make_discoverable", "is", null)
      .order("make_discoverable", { ascending: true })
      .range(0, PAGINATION_LIMIT - 1);

    if (error) {
      logger.error("fetch_discoverable_bookmarks_failed", {
        operation: "fetch_discoverable_bookmarks",
        route: "discover-ssg",
        ...extractErrorFields(error),
      });
      await logger.flush();
      return {
        props: { discoverData: [] },
        revalidate: 60,
      };
    }

    // oxlint-disable-next-line no-unsafe-type-assertion -- Supabase partial select doesn't match full SingleListData shape
    const discoverData = (data?.map((item) => ({
      ...item,
      addedCategories: [],
      addedTags: [],
    })) ?? []) as unknown as SingleListData[];

    return {
      props: { discoverData },
      revalidate: 60,
    };
  } catch (error) {
    logger.error("discover_ssg_failed", {
      operation: "fetch_discoverable_bookmarks",
      route: "discover-ssg",
      ...extractErrorFields(error),
    });
    await logger.flush();
    return {
      props: { discoverData: [] },
      revalidate: 60,
    };
  }
};

export default Discover;
