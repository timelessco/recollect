import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";

import { Spinner } from "@/components/spinner";

import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/use-update-user-profile-optimistic-mutation";
import useFetchBookmarksView from "../../async/queryHooks/bookmarks/use-fetch-bookmarks-view";
import useFetchCategories from "../../async/queryHooks/category/use-fetch-categories";
import useFetchSharedCategories from "../../async/queryHooks/share/use-fetch-shared-categories";
import useFetchUserProfile from "../../async/queryHooks/user/use-fetch-user-profile";
import { useSignOutRealtimeTeardown } from "../../hooks/use-sign-out-realtime-teardown";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../hooks/useGetSortBy";
import useIsInNotFoundPage from "../../hooks/useIsInNotFoundPage";
import { useMounted } from "../../hooks/useMounted";
import { useSupabaseSession } from "../../store/componentStore";
import { BOOKMARKS_KEY, DISCOVER_URL, LOGIN_URL } from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { getCategorySlugFromRouter } from "../../utils/url";
import NotFoundPage from "../notFoundPage";
import { BookmarkCards } from "./bookmarkCards";
import { DiscoverBookmarkCards } from "./discoverBookmarkCards";

const DashboardLayout = dynamic(() => import("./dashboardLayout"), {
  ssr: false,
});

// @remotion/player touches `window` on import — ssr: false is required.
// This is the single split point for the entire onboarding tree: modal code,
// Remotion composition, icons, and the devices.png image. Users past
// onboarding never download any of this.
const OnboardingModal = dynamic(
  async () => {
    const m = await import("@/pageComponents/onboarding/onboarding-modal");
    return { default: m.OnboardingModal };
  },
  { ssr: false },
);

const supabase = createClient();

interface DashboardProps {
  // Accepted so `getLayout` in pages can pass the route page as children.
  // Dashboard renders its own main-pane tree internally based on route —
  // `children` is intentionally not rendered.
  children?: ReactNode;
}

const navLog = (label: string, extra?: Record<string, unknown>) => {
  if (typeof window === "undefined") {
    return;
  }
  const g = globalThis as typeof globalThis & {
    __navPerf?: Record<string, unknown>[];
  };
  const t = performance.now();
  g.__navPerf ??= [];
  g.__navPerf.push({ label, t: Number(t.toFixed(0)), ...extra });
  console.log(`[nav-perf] ${label}`, t.toFixed(0), extra ?? "");
};

const Dashboard = (_props: DashboardProps) => {
  const isMounted = useMounted();
  const queryClient = useQueryClient();
  const router = useRouter();
  const categorySlug = getCategorySlugFromRouter(router);

  const setSession = useSupabaseSession((state) => state.setSession);
  const session = useSupabaseSession((state) => state.session);

  navLog(`Dashboard render`, { categorySlug, isMounted, hasSession: Boolean(session?.user?.id) });

  // Track isMounted flip
  useEffect(() => {
    if (isMounted) {
      navLog(`Dashboard isMounted -> true`);
    }
  }, [isMounted]);

  useSignOutRealtimeTeardown();

  useEffect(() => {
    const fetchSession = async () => {
      const t0 = performance.now();
      navLog(`fetchSession START`, { categorySlug });
      const { data, error } = await supabase.auth.getUser();
      navLog(`fetchSession END`, { dtMs: Number((performance.now() - t0).toFixed(0)) });

      // If there's an auth error or no user (expired session), redirect to login
      // Skip redirect for discover page (public access allowed)
      // This handles the case where middleware passes but session is actually invalid
      // Use pathname fallback since categorySlug can be null before Next.js router hydrates
      const isDiscoverRoute =
        categorySlug === DISCOVER_URL || window.location.pathname.startsWith(`/${DISCOVER_URL}`);
      if ((error || !data?.user) && !isDiscoverRoute) {
        // Clear stale auth cookie to prevent redirect loop:
        // middleware getClaims() validates JWT locally (no DB check), so a deleted user's
        // JWT passes middleware → dashboard detects invalid user → must clear session
        // before redirecting, otherwise middleware redirects back here endlessly
        await supabase.auth.signOut({ scope: "local" });
        // Redirect to login with return URL (preserve query params and hash)
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.href = `/${LOGIN_URL}?next=${encodeURIComponent(currentPath)}`;
        return;
      }

      // Set session with user if authenticated, otherwise clear session
      // Avoids creating truthy object with undefined user that confuses downstream checks
      if (data?.user) {
        setSession({ user: data.user });
      } else {
        setSession(undefined);
      }
    };

    void fetchSession();
  }, [setSession, categorySlug]);

  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
  const { isInNotFoundPage } = useIsInNotFoundPage();
  const { sortBy } = useGetSortBy();

  // Route-level invalidation: Invalidate bookmarks cache when navigating to a new page
  // This ensures fresh data is always loaded for category pages and media type pages
  useEffect(() => {
    if (session?.user?.id && CATEGORY_ID !== DISCOVER_URL) {
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session.user.id, CATEGORY_ID, sortBy],
      });
    }
  }, [CATEGORY_ID, sortBy, session?.user?.id, queryClient]);

  const { isFetchingCategories, isLoadingCategories } = useFetchCategories();

  useFetchBookmarksView();
  useFetchSharedCategories();

  const { userProfileData } = useFetchUserProfile();

  navLog(`Dashboard fetch hook snapshot`, {
    isLoadingCategories,
    isFetchingCategories,
    hasUserProfile: Boolean(userProfileData?.[0]?.id),
  });

  const { updateUserProfileOptimisticMutation } = useUpdateUserProfileOptimisticMutation();
  const updateUserProfileMutate = updateUserProfileOptimisticMutation.mutate;

  // if the user email as been changed then this updates the email in the profiles table
  useEffect(() => {
    if (
      !isNull(userProfileData) &&
      !isEmpty(userProfileData) &&
      session?.user?.email !== userProfileData?.[0]?.email &&
      userProfileData?.[0]?.email
    ) {
      updateUserProfileMutate({
        updateData: { email: session?.user?.email },
      });
    }
  }, [session?.user?.email, updateUserProfileMutate, userProfileData]);

  // this updates the provider in the profiles table if its not present
  useEffect(() => {
    if (!userProfileData?.[0]?.provider && session?.user?.app_metadata?.provider) {
      updateUserProfileMutate({
        updateData: { provider: session?.user?.app_metadata?.provider },
      });
    }
  }, [session?.user?.app_metadata?.provider, updateUserProfileMutate, userProfileData]);

  const isDiscoverPage = categorySlug === DISCOVER_URL;

  // Onboarding modal gates on profiles.onboarded_at being null. Previously
  // computed server-side via gSSP and passed in as a prop; now derived from
  // the already-in-flight user-profile fetch. Only shows on /discover
  // (onboarding landing route) and only once userProfileData resolves —
  // modal appears ~200-500 ms after first paint for brand-new users, which
  // matches UX since the modal is opt-in and not blocking.
  const showOnboarding =
    isDiscoverPage &&
    userProfileData?.[0] !== undefined &&
    userProfileData[0].onboarded_at === null;

  const renderMainPaneContent = () => {
    if (!isInNotFoundPage) {
      if (categorySlug === DISCOVER_URL) {
        return <DiscoverBookmarkCards isDiscoverPage />;
      }

      return <BookmarkCards />;
    } else if (isLoadingCategories || isFetchingCategories) {
      return "Loading";
    }

    return <NotFoundPage />;
  };

  // Gate on mount so SSR output is a spinner (matches pre-PR behavior).
  // DashboardLayout is `dynamic(..., { ssr: false })` so without this gate
  // SSR would emit blank HTML.
  if (!isMounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  if (isNil(session) && !isDiscoverPage) {
    return null;
  }

  return (
    <>
      <DashboardLayout>{renderMainPaneContent()}</DashboardLayout>
      {showOnboarding ? <OnboardingModal /> : null}
    </>
  );
};

export default Dashboard;
