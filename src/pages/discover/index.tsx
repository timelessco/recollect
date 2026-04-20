import type { GetServerSideProps } from "next";
import type { ReactElement } from "react";

import { createServerClient, serializeCookieHeader } from "@supabase/ssr";

import type { SingleListData } from "../../types/apiTypes";
import type { NextPageWithLayout } from "../_app";

import { logger } from "@/lib/api-helpers/axiom-logger";
import { extractErrorFields } from "@/lib/api-helpers/errors";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../lib/supabase/constants";
import Dashboard from "../../pageComponents/dashboard";
import { DiscoverGuestView } from "../../pageComponents/discover/DiscoverGuestView";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "../../utils/constants";

interface DiscoverPageProps {
  discoverData?: SingleListData[];
  isAuthenticated: boolean;
}

const Discover: NextPageWithLayout<DiscoverPageProps> = ({ discoverData, isAuthenticated }) => {
  // Guest SSR path — DiscoverGuestView renders server-side so crawlers see
  // the discoverable-bookmark grid. getLayout below returns `page` verbatim
  // for guests, skipping the Dashboard shell.
  if (!isAuthenticated && discoverData) {
    return <DiscoverGuestView discoverData={discoverData} />;
  }

  // Authenticated — Dashboard (wrapped via getLayout) owns the UI.
  return null;
};

Discover.getLayout = (page: ReactElement, pageProps: DiscoverPageProps) => {
  if (!pageProps.isAuthenticated) {
    return page;
  }
  return <Dashboard>{page}</Dashboard>;
};

export const getServerSideProps: GetServerSideProps<DiscoverPageProps> = async (context) => {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return context.req.cookies
          ? Object.entries(context.req.cookies).map(([name, value]) => ({
              name,
              value: value ?? "",
            }))
          : [];
      },
      setAll(cookiesToSet) {
        if (context.res) {
          try {
            for (const { name, options, value } of cookiesToSet) {
              context.res.appendHeader("Set-Cookie", serializeCookieHeader(name, value, options));
            }
          } catch {
            // Cookie setting may fail in certain Server Component contexts
            // Silently fail to prevent SSR errors
          }
        }
      },
    },
  });

  try {
    // `getClaims()` validates the JWT locally — no Supabase round-trip. Sufficient
    // for deciding guest-vs-authed SSR; `Dashboard` still runs `getUser()` client-side
    // to catch deleted-user JWTs, so a stale JWT can't leak private data.
    const { data } = await supabase.auth.getClaims();

    if (data?.claims) {
      return {
        props: {
          isAuthenticated: true,
        },
      };
    }
  } catch (error) {
    console.error("[discover-ssr] Authenticated SSR branch failed:", error);
    logger.error("discover_ssr_auth_branch_failed", {
      operation: "discover_ssr_auth_branch",
      route: "discover-ssr",
      ...extractErrorFields(error),
    });
    await logger.flush();
    // Conservative fallback: route through Dashboard rather than the guest view.
    // Safe because DashboardLayout is ssr:false and Dashboard's useEffect re-runs
    // supabase.auth.getUser() client-side and redirects to /login on failure — no
    // private data SSRs.
    return {
      props: {
        isAuthenticated: true,
      },
    };
  }

  // Guest path: SSR the discoverable bookmarks for SEO.
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
      console.error("[discover-ssr] Failed to fetch discoverable bookmarks:", error);
      logger.error("fetch_discoverable_bookmarks_failed", {
        operation: "fetch_discoverable_bookmarks",
        route: "discover-ssr",
        ...extractErrorFields(error),
      });
      await logger.flush();
      return {
        props: {
          discoverData: [],
          isAuthenticated: false,
        },
      };
    }

    // oxlint-disable-next-line no-unsafe-type-assertion -- Supabase partial select doesn't match full SingleListData shape
    const discoverData = (data?.map((item) => ({
      ...item,
      addedCategories: [],
      addedTags: [],
    })) ?? []) as unknown as SingleListData[];

    return {
      props: {
        discoverData,
        isAuthenticated: false,
      },
    };
  } catch (error) {
    console.error("[discover-ssr] Error fetching discoverable bookmarks:", error);
    logger.error("discover_ssr_guest_branch_failed", {
      operation: "fetch_discoverable_bookmarks",
      route: "discover-ssr",
      ...extractErrorFields(error),
    });
    await logger.flush();
    return {
      props: {
        discoverData: [],
        isAuthenticated: false,
      },
    };
  }
};

export default Discover;
