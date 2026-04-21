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

// Must be a sync read in the same render pass as `getLayout` — a Zustand
// session read behind a `useMounted` gate would force a two-phase render
// (guest → authed) that unmounts `Dashboard` and thrashes the sidebar on
// every nav. Pattern covers both unsplit (`sb-<ref>-auth-token`) and split
// (`sb-<ref>-auth-token.0/.1`) Supabase cookie formats.
const SUPABASE_AUTH_COOKIE_RE = /sb-[^=]+-auth-token(?:\.\d+)?=/;

const hasSupabaseAuthCookie = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }
  return SUPABASE_AUTH_COOKIE_RE.test(document.cookie);
};

// Must wrap `page` in `<Dashboard>` at the same tree position as
// `[category_id].tsx`'s `getLayout` — otherwise React reconciles the roots
// as different types and unmounts Dashboard on every `/everything ↔ /discover`
// nav. Direct authed visits (post-login redirect) hydrate from the guest
// SSR HTML into Dashboard on first paint; in-app navigation is seamless.
Discover.getLayout = (page: ReactElement) => {
  if (!hasSupabaseAuthCookie()) {
    return page;
  }
  return <Dashboard>{page}</Dashboard>;
};

// Discoverable bookmarks are curated public content — no per-user data —
// so ISR lets every nav hit the CDN instead of cold-starting a serverless
// function. `revalidate: 60` keeps the grid fresh for crawlers and first
// paint; authed users refetch client-side via React Query.
export const getStaticProps: GetStaticProps<DiscoverPageProps> = async () => {
  // Stateless server-side read — opt out of the auth state machine the
  // `@supabase/supabase-js` client would otherwise spin up per invocation.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

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
