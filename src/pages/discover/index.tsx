import type { GetServerSideProps, NextPage } from "next";

import * as Sentry from "@sentry/nextjs";
import { createServerClient, serializeCookieHeader } from "@supabase/ssr";

import type { SingleListData } from "../../types/apiTypes";

import { Spinner } from "@/components/spinner";
import { isNullable } from "@/utils/assertion-utils";

import { useMounted } from "../../hooks/useMounted";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../lib/supabase/constants";
import Dashboard from "../../pageComponents/dashboard";
import { DiscoverGuestView } from "../../pageComponents/discover/DiscoverGuestView";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "../../utils/constants";

interface DiscoverPageProps {
  discoverData?: SingleListData[];
  isAuthenticated: boolean;
  showOnboarding: boolean;
}

const Discover: NextPage<DiscoverPageProps> = ({
  discoverData,
  isAuthenticated,
  showOnboarding,
}) => {
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

  return <Dashboard showOnboarding={showOnboarding} />;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated: read profiles.onboarded_at to decide whether the welcome
  // modal should mount in first paint. Single source of truth — a client-side
  // derivation off React Query kept racing with the mark-onboarded mutation's
  // cache invalidation, causing the modal to reappear on every visit.
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
