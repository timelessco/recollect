import type { GetStaticProps } from "next";
import type { ReactElement } from "react";

import { createClient } from "@supabase/supabase-js";

import type { SingleListData } from "../../types/apiTypes";
import type { NextPageWithLayout } from "../_app";

import { logger } from "@/lib/api-helpers/axiom-logger";
import { extractErrorFields } from "@/lib/api-helpers/errors";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../lib/supabase/constants";
import Dashboard from "../../pageComponents/dashboard";
import { DiscoverGuestView } from "../../pageComponents/discover/DiscoverGuestView";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "../../utils/constants";

interface DiscoverPageProps {
  discoverData: SingleListData[];
}

const Discover: NextPageWithLayout<DiscoverPageProps> = ({ discoverData }) => (
  <DiscoverGuestView discoverData={discoverData} />
);

// Sync auth probe — returns false on the server (no `document`), so SSR emits
// the static guest HTML for SEO. On the client it reads the Supabase auth
// cookie directly so `getLayout` can pick `<Dashboard>{page}</Dashboard>` for
// authed users in the same render pass. Using the Zustand session instead
// would force a two-phase render (guest → authed after `useMounted` flips),
// which unmounts `Dashboard` and thrashes the sidebar on every nav. Cookie
// name pattern covers both single (`sb-<ref>-auth-token`) and split
// (`sb-<ref>-auth-token.0/.1`) Supabase cookie formats.
const hasSupabaseAuthCookie = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }
  return /sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie);
};

// `getLayout` must return `<Dashboard>{page}</Dashboard>` at the same tree
// position as `[category_id].tsx`'s `getLayout` so React reconciles Dashboard
// across `/everything → /discover` and back — otherwise Dashboard unmounts
// and the sidebar re-renders on every nav. For the initial authed visit to
// /discover (post-login redirect), the SSR HTML renders the guest view;
// client hydration re-renders into Dashboard on first paint. Brief swap, but
// navigations from other dashboard routes are seamless.
Discover.getLayout = (page: ReactElement) => {
  if (!hasSupabaseAuthCookie()) {
    return page;
  }
  return <Dashboard>{page}</Dashboard>;
};

// Static generation with ISR — served from Vercel CDN, no serverless function
// per request. Guest bookmark grid refreshes every 60 s. Previously used gSSP,
// which incurred a ~3-6 s cold-start for the /discover function on every nav
// (authed users paid the same cost for a 76-byte short-circuit stub).
export const getStaticProps: GetStaticProps<DiscoverPageProps> = async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const page = 0;
    const rangeStart = page * PAGINATION_LIMIT;
    const rangeEnd = (page + 1) * PAGINATION_LIMIT - 1;

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
      .range(rangeStart, rangeEnd);

    if (error) {
      logger.error("fetch_discoverable_bookmarks_failed", {
        operation: "fetch_discoverable_bookmarks",
        route: "discover-isr",
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
    logger.error("discover_isr_fetch_failed", {
      operation: "fetch_discoverable_bookmarks",
      route: "discover-isr",
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
