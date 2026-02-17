import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import omit from "lodash/omit";
import Dropzone from "react-dropzone";
import InfiniteScroll from "react-infinite-scroll-component";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import isNull from "lodash/isNull";

import { useMoveBookmarkToTrashOptimisticMutation } from "../../async/mutationHooks/bookmarks/use-move-bookmark-to-trash-optimistic-mutation";
import useAddBookmarkMinDataOptimisticMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation";
import useAddBookmarkScreenshotMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkScreenshotMutation";
import useDeleteBookmarksOptimisticMutation from "../../async/mutationHooks/bookmarks/useDeleteBookmarksOptimisticMutation";
import useFileUploadOptimisticMutation from "../../async/mutationHooks/files/useFileUploadOptimisticMutation";
import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import useFetchBookmarksCount from "../../async/queryHooks/bookmarks/useFetchBookmarksCount";
import useFetchBookmarksView from "../../async/queryHooks/bookmarks/useFetchBookmarksView";
import useFetchPaginatedBookmarks from "../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../async/queryHooks/bookmarks/useSearchBookmarks";
import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import { clipboardUpload } from "../../async/uploads/clipboard-upload";
import { useFileUploadDrop } from "../../hooks/useFileUploadDrop";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../hooks/useGetSortBy";
import useIsInNotFoundPage from "../../hooks/useIsInNotFoundPage";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type SingleBookmarksPaginatedDataTypes } from "../../types/apiTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import {
	AUDIO_URL,
	BOOKMARKS_KEY,
	DISCOVER_URL,
	DOCUMENTS_URL,
	IMAGES_URL,
	INSTAGRAM_URL,
	LINKS_URL,
	LOGIN_URL,
	TRASH_URL,
	TWEETS_URL,
	UNCATEGORIZED_URL,
	VIDEOS_URL,
} from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { errorToast } from "../../utils/toastMessages";
import { getCategorySlugFromRouter } from "../../utils/url";
import NotFoundPage from "../notFoundPage";

import { DiscoverBookmarkCards } from "./discoverBookmarkCards";
import { handleBulkBookmarkDelete } from "./handleBookmarkDelete";
import SettingsModal from "./modals/settingsModal";
import SignedOutSection from "./signedOutSection";
import { getBookmarkCountForCurrentPage } from "@/utils/helpers";

// import CardSection from "./cardSection";
const CardSection = dynamic(async () => await import("./cardSection"), {
	ssr: false,
});

const DashboardLayout = dynamic(async () => await import("./dashboardLayout"), {
	ssr: false,
});

const Dashboard = () => {
	const supabase = createClient();
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
	}, [setSession, supabase.auth, categorySlug]);

	const setDeleteBookmarkId = useMiscellaneousStore(
		(state) => state.setDeleteBookmarkId,
	);

	const deleteBookmarkId = useMiscellaneousStore(
		(state) => state.deleteBookmarkId,
	);

	const infiniteScrollRef = useRef<HTMLDivElement>(null);

	const searchText = useMiscellaneousStore((state) => state.searchText);
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);

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

	// react-query

	const { allCategories, isLoadingCategories, isFetchingCategories } =
		useFetchCategories();

	const { bookmarksCountData } = useFetchBookmarksCount();

	const {
		everythingData,
		flattendPaginationBookmarkData,
		fetchNextPage: fetchNextBookmarkPage,
		isEverythingDataLoading,
	} = useFetchPaginatedBookmarks();

	const {
		flattenedSearchData,
		fetchNextPage: fetchNextSearchPage,
		hasNextPage: searchHasNextPage,
	} = useSearchBookmarks();

	// Determine if we're currently searching (searchText is debounced at source)
	const isSearching = !isEmpty(searchText);
	const isDiscoverPage = categorySlug === DISCOVER_URL;

	useFetchBookmarksView();

	const { userProfileData, isLoading: isUserProfileLoading } =
		useFetchUserProfile();

	// Mutations

	const { moveBookmarkToTrashOptimisticMutation } =
		useMoveBookmarkToTrashOptimisticMutation();

	const { deleteBookmarkOptismicMutation } =
		useDeleteBookmarksOptimisticMutation();

	const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();

	const { addBookmarkMinDataOptimisticMutation } =
		useAddBookmarkMinDataOptimisticMutation();

	// profiles table mutation

	const { updateUserProfileOptimisticMutation } =
		useUpdateUserProfileOptimisticMutation();

	// files mutation
	const { fileUploadOptimisticMutation } = useFileUploadOptimisticMutation();

	// END OF MUTATIONS ---------

	// this is for the clipboard upload

	useEffect(() => {
		if (typeof window !== "undefined") {
			const listener = (event: ClipboardEvent) => {
				// Skip if current path is trash URL
				if (window.location.pathname === `/${TRASH_URL}`) {
					return;
				}

				const target = event.target as HTMLElement;

				// Skip if pasting inside input, textarea, or contenteditable
				const isEditable =
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.closest(".skip-global-paste");

				if (isEditable) {
					return;
				}

				// Otherwise handle global paste
				void clipboardUpload(
					event.clipboardData?.getData("text"),
					event.clipboardData?.files,
					CATEGORY_ID,
					addBookmarkMinDataOptimisticMutation,
					fileUploadOptimisticMutation,
				);
			};

			window.addEventListener("paste", listener);
			return () => window.removeEventListener("paste", listener);
		}

		return undefined;
	}, [
		CATEGORY_ID,
		addBookmarkMinDataOptimisticMutation,
		fileUploadOptimisticMutation,
	]);

	// if the user email as been changed then this updates the email in the profiles table
	useEffect(() => {
		if (
			!isNull(userProfileData?.data) &&
			!isEmpty(userProfileData?.data) &&
			session?.user?.email !== userProfileData?.data[0]?.email &&
			userProfileData?.data[0]?.email
		) {
			void mutationApiCall(
				updateUserProfileOptimisticMutation.mutateAsync({
					updateData: { email: session?.user?.email },
				}),
			);
		}
	}, [
		session,
		session?.user?.email,
		updateUserProfileOptimisticMutation,
		userProfileData,
	]);

	// this updates the provider in the profiles table if its not present
	useEffect(() => {
		if (
			!userProfileData?.data?.[0]?.provider &&
			session?.user?.app_metadata?.provider
		) {
			void mutationApiCall(
				updateUserProfileOptimisticMutation.mutateAsync({
					updateData: { provider: session?.user?.app_metadata?.provider },
				}),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userProfileData?.data?.[0]?.provider]);

	// tells if the latest paginated data is the end for total bookmark data based on current category
	const hasMoreLogic = (): boolean => {
		// If we're searching, use the search pagination logic
		if (isSearching) {
			return searchHasNextPage ?? false;
		}

		const firstPaginatedData =
			everythingData?.pages?.length !== 0
				? (everythingData?.pages[0] as SingleBookmarksPaginatedDataTypes)
				: null;

		if (!isNull(firstPaginatedData)) {
			if (typeof CATEGORY_ID === "number") {
				const totalBookmarkCountInCategory = find(
					bookmarksCountData?.data?.categoryCount,
					(item) => item?.category_id === CATEGORY_ID,
				);

				return (
					totalBookmarkCountInCategory?.count !==
					flattendPaginationBookmarkData?.length
				);
			}

			if (CATEGORY_ID === null) {
				const count = bookmarksCountData?.data?.everything;
				return count !== flattendPaginationBookmarkData?.length;
			}

			if (CATEGORY_ID === TRASH_URL) {
				const count = bookmarksCountData?.data?.trash;

				return count !== flattendPaginationBookmarkData?.length;
			}

			if (CATEGORY_ID === UNCATEGORIZED_URL) {
				const count = bookmarksCountData?.data?.uncategorized;

				return count !== flattendPaginationBookmarkData?.length;
			}

			if ((CATEGORY_ID as unknown) === IMAGES_URL) {
				const count = bookmarksCountData?.data?.images;

				return count !== flattendPaginationBookmarkData?.length;
			}

			if ((CATEGORY_ID as unknown) === VIDEOS_URL) {
				const count = bookmarksCountData?.data?.videos;

				return count !== flattendPaginationBookmarkData?.length;
			}

			if ((CATEGORY_ID as unknown) === DOCUMENTS_URL) {
				const count = bookmarksCountData?.data?.documents;

				return count !== flattendPaginationBookmarkData?.length;
			}

			if ((CATEGORY_ID as unknown) === TWEETS_URL) {
				const count = bookmarksCountData?.data?.tweets;

				return count !== flattendPaginationBookmarkData?.length;
			}

			if ((CATEGORY_ID as unknown) === INSTAGRAM_URL) {
				const count = bookmarksCountData?.data?.instagram;

				return count !== flattendPaginationBookmarkData?.length;
			}

			if ((CATEGORY_ID as unknown) === AUDIO_URL) {
				const count = bookmarksCountData?.data?.audio;

				return count !== flattendPaginationBookmarkData?.length;
			}

			if ((CATEGORY_ID as unknown) === LINKS_URL) {
				const count = bookmarksCountData?.data?.links;

				return count !== flattendPaginationBookmarkData?.length;
			}

			return true;
		}

		return true;
	};

	const { onDrop } = useFileUploadDrop();

	const renderAllBookmarkCards = () => (
		<>
			{session ? (
				<>
					<div className="mx-auto w-full max-xl:w-1/2" />
					<Dropzone
						disabled={CATEGORY_ID === TRASH_URL}
						noClick
						onDrop={onDrop}
					>
						{({ getRootProps, getInputProps, isDragActive }) => (
							<div
								{...omit(getRootProps(), ["onBlur", "onFocus"])}
								className={
									isDragActive
										? "absolute z-10 h-full w-full bg-gray-800 opacity-50"
										: "outline-hidden"
								}
							>
								<input {...getInputProps()} />
								<div
									id="scrollableDiv"
									ref={infiniteScrollRef}
									style={{
										height: "100vh",
										overflowY: "auto",
										overflowX: "hidden",
										overflowAnchor: "none",
									}}
								>
									<InfiniteScroll
										dataLength={
											isSearching
												? (flattenedSearchData?.length ?? 0)
												: (flattendPaginationBookmarkData?.length ?? 0)
										}
										endMessage={
											<p className="pb-6 text-center text-plain-reverse">
												{isSearchLoading ? "" : "Life happens, save it."}
											</p>
										}
										hasMore={isSearching ? searchHasNextPage : hasMoreLogic()}
										loader={<div />}
										next={
											isSearching ? fetchNextSearchPage : fetchNextBookmarkPage
										}
										scrollableTarget="scrollableDiv"
										style={{ overflow: "unset" }}
									>
										<CardSection
											bookmarksCountData={getBookmarkCountForCurrentPage(
												bookmarksCountData?.data ?? undefined,
												CATEGORY_ID as unknown as string | number | null,
											)}
											flattendPaginationBookmarkData={
												flattendPaginationBookmarkData
											}
											isBookmarkLoading={
												addBookmarkMinDataOptimisticMutation?.isPending
											}
											isLoading={
												isEverythingDataLoading ||
												(isSearchLoading &&
													(flattenedSearchData?.length ?? 0) === 0)
											}
											isLoadingProfile={isUserProfileLoading}
											isOgImgLoading={addBookmarkScreenshotMutation?.isPending}
											listData={
												isSearching
													? flattenedSearchData
													: flattendPaginationBookmarkData
											}
											onDeleteClick={(item) => {
												if (CATEGORY_ID === TRASH_URL) {
													// delete bookmark permanently if in trash
													handleBulkBookmarkDelete({
														bookmarkIds: item?.map((delItem) => delItem?.id),
														deleteForever: true,
														isTrash: true,
														isSearching,
														flattenedSearchData: flattenedSearchData ?? [],
														flattendPaginationBookmarkData:
															flattendPaginationBookmarkData ?? [],
														deleteBookmarkId,
														setDeleteBookmarkId,
														sessionUserId: session?.user?.id,
														moveBookmarkToTrashOptimisticMutation,
														deleteBookmarkOptismicMutation,
														clearSelection: () => {},
														mutationApiCall,
														errorToast,
													});
												} else if (!isEmpty(item) && item?.length > 0) {
													// if not in trash then move bookmark to trash
													const firstItem = item.at(0);
													if (firstItem) {
														void mutationApiCall(
															moveBookmarkToTrashOptimisticMutation.mutateAsync(
																{
																	data: [firstItem],
																	isTrash: true,
																},
															),
															// eslint-disable-next-line promise/prefer-await-to-then
														).catch(() => {});
													}
												}
											}}
											onMoveOutOfTrashClick={(data) => {
												void mutationApiCall(
													moveBookmarkToTrashOptimisticMutation.mutateAsync({
														data: [data],
														isTrash: false,
													}),
												);
											}}
											showAvatar={
												// only show for a collab category
												Boolean(
													CATEGORY_ID &&
													!isNull(CATEGORY_ID) &&
													(allCategories?.data?.find(
														(item) => item?.id === CATEGORY_ID,
													)?.collabData?.length ?? 0) > 1,
												)
											}
											userId={session?.user?.id ?? ""}
										/>
									</InfiniteScroll>
								</div>
							</div>
						)}
					</Dropzone>
				</>
			) : (
				<SignedOutSection />
			)}
		</>
	);

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
				case IMAGES_URL:
					return renderAllBookmarkCards();
				case VIDEOS_URL:
					return renderAllBookmarkCards();
				case LINKS_URL:
					return renderAllBookmarkCards();

				default:
					return renderAllBookmarkCards();
			}
		} else if (isLoadingCategories || isFetchingCategories) {
			return "Loading";
		}

		return <NotFoundPage />;
	};

	if (isNil(session) && !isDiscoverPage) {
		return <div />;
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
