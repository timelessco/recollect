import type { GetServerSideProps, NextPage } from "next";

import * as Sentry from "@sentry/nextjs";
import { createServerClient, serializeCookieHeader } from "@supabase/ssr";

import type { SingleListData } from "../types/apiTypes";

import { Spinner } from "@/components/spinner";

import { useMounted } from "../hooks/useMounted";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/supabase/constants";
import Dashboard from "../pageComponents/dashboard";
import { DiscoverGuestView } from "../pageComponents/discover/DiscoverGuestView";
import { DISCOVER_URL, MAIN_TABLE_NAME, PAGINATION_LIMIT } from "../utils/constants";

interface CategoryPageProps {
  discoverData?: SingleListData[];
  isAuthenticated?: boolean;
  isDiscover?: boolean;
  showOnboarding?: boolean;
}

const Home: NextPage<CategoryPageProps> = ({
  discoverData,
  isAuthenticated,
  isDiscover,
  showOnboarding,
}) => {
  const isMounted = useMounted();

  if (isDiscover && !isAuthenticated && discoverData) {
    return <DiscoverGuestView discoverData={discoverData} />;
  }

  if (!isMounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  return <Dashboard showOnboarding={isDiscover ? showOnboarding : false} />;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const categoryId = String(context.params?.category_id ?? "");
  const isDiscover = categoryId === DISCOVER_URL;

  if (!isDiscover) {
    return {
      props: {
        discoverData: [],
        isAuthenticated: true,
        isDiscover: false,
        showOnboarding: false,
      },
    };
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = Boolean(user);

  if (!user) {
    try {
      // Query Supabase directly instead of HTTP fetch to own API
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
					category_id,
					trash,
					type,
					meta_data,
					sort_index,
					make_discoverable
				`,
        )
        .is("trash", null)
        .not("make_discoverable", "is", null)
        .order("make_discoverable", { ascending: true })
        .range(rangeStart, rangeEnd);

      if (error) {
        console.error("[discover-ssr] Failed to fetch discoverable bookmarks:", error);
        Sentry.captureException(error, {
          extra: { categoryId, isAuthenticated },
          tags: { route: "discover-ssr" },
        });
        return {
          props: {
            discoverData: [],
            isAuthenticated: false,
            isDiscover: true,
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
          isDiscover: true,
          showOnboarding: false,
        },
      };
    } catch (error) {
      console.error("[discover-ssr] Error fetching discoverable bookmarks:", error);
      Sentry.captureException(error, {
        extra: { categoryId, isAuthenticated },
        tags: { route: "discover-ssr" },
      });
      return {
        props: {
          discoverData: [],
          isAuthenticated: false,
          isDiscover: true,
          showOnboarding: false,
        },
      };
    }
  }

  // Authenticated /discover — check the onboarding flag to decide whether
  // to mount the welcome modal in first paint. This is the SSR gate that
  // serves as the backstop for the auth callback redirect (src/lib/auth/
  // resolve-callback-redirect.ts). If the callback misroutes a first-timer,
  // the moment they land on /discover we still detect it and show the modal.
  let showOnboarding = false;
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    Sentry.captureException(profileError, {
      extra: { categoryId, userId: user.id },
      tags: {
        operation: "fetch_onboarding_flag",
        route: "discover-ssr",
      },
    });
    // Fail closed — don't show the modal if we can't read the flag.
  } else {
    showOnboarding = profileRow?.onboarding_complete === false;
  }

  return {
    props: {
      discoverData: [],
      isAuthenticated: true,
      isDiscover: true,
      showOnboarding,
    },
  };
};

export default Home;
