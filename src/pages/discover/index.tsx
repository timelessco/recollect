import type { GetServerSideProps } from "next";
import type { ReactElement } from "react";

import * as Sentry from "@sentry/nextjs";
import { createServerClient, serializeCookieHeader } from "@supabase/ssr";

import type { SingleListData } from "../../types/apiTypes";
import type { NextPageWithLayout } from "../_app";

import { isNullable } from "@/utils/assertion-utils";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../lib/supabase/constants";
import Dashboard from "../../pageComponents/dashboard";
import { DiscoverGuestView } from "../../pageComponents/discover/DiscoverGuestView";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "../../utils/constants";

interface DiscoverPageProps {
  discoverData?: SingleListData[];
  isAuthenticated: boolean;
  showOnboarding: boolean;
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
  return <Dashboard showOnboarding={pageProps.showOnboarding}>{page}</Dashboard>;
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      let showOnboarding = false;
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        Sentry.captureException(profileError, {
          extra: { userId: user.id },
          tags: {
            operation: "fetch_onboarding_flag",
            route: "discover-ssr",
          },
        });
        // Fail closed — don't show the modal if we can't read the flag.
      } else {
        showOnboarding = isNullable(profileRow?.onboarded_at);
      }

      return {
        props: {
          isAuthenticated: true,
          showOnboarding,
        },
      };
    }
  } catch (error) {
    console.error("[discover-ssr] Authenticated SSR branch failed:", error);
    Sentry.captureException(error, {
      tags: {
        operation: "fetch_onboarding_flag",
        route: "discover-ssr",
      },
    });
    // Conservative fallback: we can't distinguish a throw from supabase.auth.getUser()
    // vs the profiles query here, so route through Dashboard rather than the guest view.
    // Safe because DashboardLayout is ssr:false and Dashboard's useEffect re-runs
    // supabase.auth.getUser() client-side and redirects to /login on failure — no
    // private data SSRs. getLayout wraps this in <Dashboard showOnboarding=false>.
    return {
      props: {
        isAuthenticated: true,
        showOnboarding: false,
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
      Sentry.captureException(error, {
        tags: { route: "discover-ssr" },
      });
      return {
        props: {
          discoverData: [],
          isAuthenticated: false,
          showOnboarding: false,
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
        showOnboarding: false,
      },
    };
  } catch (error) {
    console.error("[discover-ssr] Error fetching discoverable bookmarks:", error);
    Sentry.captureException(error, {
      tags: { route: "discover-ssr" },
    });
    return {
      props: {
        discoverData: [],
        isAuthenticated: false,
        showOnboarding: false,
      },
    };
  }
};

export default Discover;
