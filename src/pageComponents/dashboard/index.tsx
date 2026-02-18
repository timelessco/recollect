import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import useFetchBookmarksView from "../../async/queryHooks/bookmarks/useFetchBookmarksView";
import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../hooks/useGetSortBy";
import useIsInNotFoundPage from "../../hooks/useIsInNotFoundPage";
import { useSupabaseSession } from "../../store/componentStore";
import { mutationApiCall } from "../../utils/apiHelpers";
import { BOOKMARKS_KEY, DISCOVER_URL, LOGIN_URL } from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { getCategorySlugFromRouter } from "../../utils/url";
import NotFoundPage from "../notFoundPage";

import { BookmarkCards } from "./bookmarkCards";
import { DiscoverBookmarkCards } from "./discoverBookmarkCards";
import SettingsModal from "./modals/settingsModal";

const DashboardLayout = dynamic(async () => await import("./dashboardLayout"), {
	ssr: false,
});

const supabase = createClient();

const Dashboard = () => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const categorySlug = getCategorySlugFromRouter(router);

	const setSession = useSupabaseSession((state) => state.setSession);
	const session = useSupabaseSession((state) => state.session);

	useEffect(() => {
		const fetchSession = async () => {
			const { data, error } = await supabase.auth.getUser();

			// If there's an auth error or no user (expired session), redirect to login
			// Skip redirect for discover page (public access allowed)
			// This handles the case where middleware passes but session is actually invalid
			// Use pathname fallback since categorySlug can be null before Next.js router hydrates
			const isDiscoverRoute =
				categorySlug === DISCOVER_URL ||
				window.location.pathname.startsWith(`/${DISCOVER_URL}`);
			if ((error || !data?.user) && !isDiscoverRoute) {
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

	const { isLoadingCategories, isFetchingCategories } = useFetchCategories();

	useFetchBookmarksView();

	const { userProfileData } = useFetchUserProfile();

	const { updateUserProfileOptimisticMutation } =
		useUpdateUserProfileOptimisticMutation();
	const updateUserProfileMutateAsync =
		updateUserProfileOptimisticMutation.mutateAsync;

	// if the user email as been changed then this updates the email in the profiles table
	useEffect(() => {
		if (
			!isNull(userProfileData?.data) &&
			!isEmpty(userProfileData?.data) &&
			session?.user?.email !== userProfileData?.data[0]?.email &&
			userProfileData?.data[0]?.email
		) {
			void mutationApiCall(
				updateUserProfileMutateAsync({
					updateData: { email: session?.user?.email },
				}),
			);
		}
	}, [
		session?.user?.email,
		updateUserProfileMutateAsync,
		userProfileData?.data,
	]);

	// this updates the provider in the profiles table if its not present
	useEffect(() => {
		if (
			!userProfileData?.data?.[0]?.provider &&
			session?.user?.app_metadata?.provider
		) {
			void mutationApiCall(
				updateUserProfileMutateAsync({
					updateData: { provider: session?.user?.app_metadata?.provider },
				}),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userProfileData?.data?.[0]?.provider]);

	const isDiscoverPage = categorySlug === DISCOVER_URL;

	const renderMainPaneContent = () => {
		if (!isInNotFoundPage) {
			// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
			switch (categorySlug) {
				case DISCOVER_URL:
					return (
						<DiscoverBookmarkCards
							isDiscoverPage
							userId={session?.user?.id ?? ""}
						/>
					);

				default:
					return <BookmarkCards />;
			}
		} else if (isLoadingCategories || isFetchingCategories) {
			return "Loading";
		}

		return <NotFoundPage />;
	};

	if (isNil(session) && !isDiscoverPage) {
		return null;
	}

	return (
		<>
			<DashboardLayout>{renderMainPaneContent()}</DashboardLayout>

			<SettingsModal />

			<ToastContainer />
		</>
	);
};

export default Dashboard;
