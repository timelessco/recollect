import type { GetStaticProps } from "next";
import type { ReactElement, ReactNode } from "react";

import { createClient } from "@supabase/supabase-js";

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

// Guest view is the only thing rendered in static HTML — crawlers see this.
// Authed users are swapped to the Dashboard shell by DiscoverShell (getLayout)
// after client-side hydration + session detection.
const Discover: NextPageWithLayout<DiscoverPageProps> = ({ discoverData }) => (
  <DiscoverGuestView discoverData={discoverData} />
);

// Layout gate: SSR + guest render the page verbatim (bookmark grid for SEO).
// Authed clients swap to <Dashboard/>, which owns its own main-pane rendering
// based on `categorySlug === 'discover'`.
const DiscoverShell = ({ children }: { children: ReactNode }) => {
  const isMounted = useMounted();
  const session = useSupabaseSession((state) => state.session);

  if (!isMounted || !session?.user) {
    return children;
  }
  return <Dashboard />;
};

Discover.getLayout = (page: ReactElement) => <DiscoverShell>{page}</DiscoverShell>;

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
