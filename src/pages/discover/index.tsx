import type { GetServerSideProps, NextPage } from "next";

import * as Sentry from "@sentry/nextjs";
import { createServerClient, serializeCookieHeader } from "@supabase/ssr";

import type { SingleListData } from "../../types/apiTypes";

import { Spinner } from "@/components/spinner";

import { useMounted } from "../../hooks/useMounted";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../lib/supabase/constants";
import Dashboard from "../../pageComponents/dashboard";
import { DiscoverGuestView } from "../../pageComponents/discover/DiscoverGuestView";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "../../utils/constants";

interface DiscoverPageProps {
  discoverData?: SingleListData[];
  isAuthenticated: boolean;
}

const Discover: NextPage<DiscoverPageProps> = ({ discoverData, isAuthenticated }) => {
  const isMounted = useMounted();

  if (!isAuthenticated && discoverData) {
    return <DiscoverGuestView discoverData={discoverData} />;
  }

  if (!isMounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  return <Dashboard />;
};

export const getServerSideProps: GetServerSideProps<DiscoverPageProps> = async (context) => {
  // Create Supabase client for SSR
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
              context.res.setHeader("Set-Cookie", serializeCookieHeader(name, value, options));
            }
          } catch {
            // Cookie setting may fail in certain Server Component contexts
            // Silently fail to prevent SSR errors
          }
        }
      },
    },
  });

  // getClaims() validates the JWT locally (no network call) — avoids blocking
  // authenticated navigations on a Supabase round-trip. The onboarding-flag
  // check is performed client-side in Dashboard via useFetchUserProfile.
  const { data: claimsData } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(claimsData?.claims);

  if (isAuthenticated) {
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
      Sentry.captureException(error, {
        tags: { route: "discover-ssr" },
      });
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
    Sentry.captureException(error, {
      tags: { route: "discover-ssr" },
    });
    return {
      props: {
        discoverData: [],
        isAuthenticated: false,
      },
    };
  }
};

export default Discover;
