import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import omit from "lodash/omit";
import Dropzone from "react-dropzone";
import InfiniteScroll from "react-infinite-scroll-component";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import isNull from "lodash/isNull";

import useAddBookmarkMinDataOptimisticMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation";
import useAddBookmarkScreenshotMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkScreenshotMutation";
import useClearBookmarksInTrashMutation from "../../async/mutationHooks/bookmarks/useClearBookmarksInTrashMutation";
import useDeleteBookmarksOptimisticMutation from "../../async/mutationHooks/bookmarks/useDeleteBookmarksOptimisticMutation";
import useMoveBookmarkToTrashOptimisticMutation from "../../async/mutationHooks/bookmarks/useMoveBookmarkToTrashOptimisticMutation";
import { useUpdateCategoryMutation } from "../../async/mutationHooks/category/use-update-category-mutation";
import useFileUploadOptimisticMutation from "../../async/mutationHooks/files/useFileUploadOptimisticMutation";
import useUpdateSharedCategoriesOptimisticMutation from "../../async/mutationHooks/share/useUpdateSharedCategoriesOptimisticMutation";
import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import useFetchBookmarksCount from "../../async/queryHooks/bookmarks/useFetchBookmarksCount";
import useFetchBookmarksView from "../../async/queryHooks/bookmarks/useFetchBookmarksView";
import useFetchPaginatedBookmarks from "../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../async/queryHooks/bookmarks/useSearchBookmarks";
import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import useFetchSharedCategories from "../../async/queryHooks/share/useFetchSharedCategories";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import { clipboardUpload } from "../../async/uploads/clipboard-upload";
import { fileUpload } from "../../async/uploads/file-upload";
import useDebounce from "../../hooks/useDebounce";
import { useDeleteCollection } from "../../hooks/useDeleteCollection";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useIsInNotFoundPage from "../../hooks/useIsInNotFoundPage";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type ProfilesTableTypes,
	type SingleBookmarksPaginatedDataTypes,
} from "../../types/apiTypes";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { type FileType } from "../../types/componentTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import {
	DISCOVER_URL,
	DOCUMENTS_URL,
	IMAGES_URL,
	LINKS_URL,
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

	const setSession = useSupabaseSession((state) => state.setSession);

	const session = useSupabaseSession((state) => state.session);

	useEffect(() => {
		const fetchSession = async () => {
			const supabaseGetUserData = await supabase.auth.getUser();
			setSession({ user: supabaseGetUserData?.data?.user });
		};

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		fetchSession();
	}, [setSession, supabase.auth]);

	const setDeleteBookmarkId = useMiscellaneousStore(
		(state) => state.setDeleteBookmarkId,
	);

	const deleteBookmarkId = useMiscellaneousStore(
		(state) => state.deleteBookmarkId,
	);

	const infiniteScrollRef = useRef<HTMLDivElement>(null);

	const router = useRouter();
	const categorySlug = getCategorySlugFromRouter(router);

	const toggleIsSortByLoading = useLoadersStore(
		(state) => state.toggleIsSortByLoading,
	);

	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearchText = useDebounce(searchText, 500);
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { isInNotFoundPage } = useIsInNotFoundPage();

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

	// Determine if we're currently searching (use debounced to match when query runs)
	const isSearching = !isEmpty(debouncedSearchText);
	const isDiscoverPage = categorySlug === DISCOVER_URL;

	const { sharedCategoriesData } = useFetchSharedCategories();

	useFetchBookmarksView();

	const { userProfileData, isLoading: isUserProfileLoading } =
		useFetchUserProfile();

	// Mutations

	const { moveBookmarkToTrashOptimisticMutation } =
		useMoveBookmarkToTrashOptimisticMutation();

	const { deleteBookmarkOptismicMutation } =
		useDeleteBookmarksOptimisticMutation();

	const { clearBookmarksInTrashMutation, isPending: isClearingTrash } =
		useClearBookmarksInTrashMutation();
	const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();

	const { addBookmarkMinDataOptimisticMutation } =
		useAddBookmarkMinDataOptimisticMutation();

	// tag mutation

	const { onDeleteCollection } = useDeleteCollection();

	const { updateCategoryMutation } = useUpdateCategoryMutation();

	// share category mutation

	const { updateSharedCategoriesOptimisticMutation } =
		useUpdateSharedCategoriesOptimisticMutation();

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

	const addBookmarkLogic = async (url: string) => {
		const currentCategory = find(
			allCategories?.data,
			(item) => item?.id === CATEGORY_ID,
		) as unknown as CategoriesData;

		// only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncategorised
		// if cat_id not number then user is not updated in a category , so access will always be true
		const updateAccessCondition =
			typeof CATEGORY_ID === "number"
				? find(
						currentCategory?.collabData,
						(item) => item?.userEmail === session?.user?.email,
					)?.edit_access === true ||
					currentCategory?.user_id?.id === session?.user?.id
				: true;

		await mutationApiCall(
			addBookmarkMinDataOptimisticMutation.mutateAsync({
				url,
				category_id: CATEGORY_ID,
				update_access: updateAccessCondition,
			}),
		);
	};

	const bookmarksViewApiLogic = (
		value: BookmarksSortByTypes | BookmarksViewTypes | number[] | string[],
		type: BookmarkViewCategories,
	) => {
		const currentCategory = find(
			allCategories?.data,
			(item) => item?.id === CATEGORY_ID,
		);

		const isUserTheCategoryOwner =
			session?.user?.id === currentCategory?.user_id?.id;

		const mutationCall = (updateValue: string) => {
			if (updateValue === "sortBy") {
				toggleIsSortByLoading();
			}

			const cardContentViewLogic = (
				existingViewData: BookmarkViewDataTypes["cardContentViewArray"],
				// TS disabled because we need to have the function here as its under the scope of the parent function
			) => {
				// this function sets the always on values for different views
				// like if in moodboard then the cover img should always be present, even if its turned off in another view like list view
				if (value === "moodboard" && !existingViewData?.includes("cover")) {
					// if view is moodboard and it does not include card then add card
					return ["cover", ...existingViewData];
				}

				if (value === "card" && !existingViewData?.includes("cover")) {
					return ["cover", ...existingViewData];
				}

				if (value === "list" && !existingViewData?.includes("title")) {
					return ["title", ...existingViewData];
				}

				return existingViewData;
			};

			if (currentCategory && typeof CATEGORY_ID === "number") {
				// for a collection
				if (isUserTheCategoryOwner) {
					// if user is the collection owner
					updateCategoryMutation.mutate({
						category_id: CATEGORY_ID,
						updateData: {
							category_views: {
								...currentCategory.category_views,
								cardContentViewArray: cardContentViewLogic(
									currentCategory.category_views.cardContentViewArray,
								),
								[updateValue]: value,
							},
						},
					});
				} else {
					// if user is not the collection owner
					const sharedCategoriesId = find(
						sharedCategoriesData?.data,
						(item) => item?.category_id === CATEGORY_ID,
					)?.id;

					if (sharedCategoriesId !== undefined) {
						const existingSharedCollectionViewsData = find(
							sharedCategoriesData?.data,
							(item) => item?.id === sharedCategoriesId,
						);

						if (!isNil(existingSharedCollectionViewsData)) {
							void mutationApiCall(
								updateSharedCategoriesOptimisticMutation.mutateAsync({
									id: sharedCategoriesId,
									updateData: {
										category_views: {
											...existingSharedCollectionViewsData?.category_views,
											cardContentViewArray: cardContentViewLogic(
												existingSharedCollectionViewsData?.category_views
													?.cardContentViewArray,
											),
											[updateValue]: value,
										},
									},
								}),
							);
						}

						console.error("existing share collab data is not present");
					}
				}
			} else {
				// user is updating for non collection pages

				// only if user is updating sortby, then scroll to top
				if (updateValue === "sortBy" && !isNull(infiniteScrollRef?.current)) {
					infiniteScrollRef?.current?.scrollTo(0, 0);
				}

				if (!isNull(userProfileData?.data) && !isNil(userProfileData)) {
					const data = {
						bookmarks_view: {
							...userProfileData?.data[0]?.bookmarks_view,
							cardContentViewArray: cardContentViewLogic(
								userProfileData?.data[0]?.bookmarks_view
									?.cardContentViewArray as string[],
							),
							[updateValue]: value,
						},
					} as ProfilesTableTypes;

					void mutationApiCall(
						updateUserProfileOptimisticMutation.mutateAsync({
							updateData: data,
						}),
					);
				} else {
					console.error("user profiles data is null");
				}
			}
		};

		switch (type) {
			case "view":
				mutationCall("bookmarksView");
				break;
			case "info":
				mutationCall("cardContentViewArray");
				break;
			case "colums":
				mutationCall("moodboardColumns");
				break;
			case "sort":
				mutationCall("sortBy");
				break;
			default:
				break;
		}
	};

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

			if ((CATEGORY_ID as unknown) === LINKS_URL) {
				const count = bookmarksCountData?.data?.links;

				return count !== flattendPaginationBookmarkData?.length;
			}

			return true;
		}

		return true;
	};

	const onDrop = useCallback(
		async (acceptedFiles: FileType[]) => {
			await fileUpload(
				acceptedFiles as unknown as FileList,
				fileUploadOptimisticMutation,
				CATEGORY_ID,
			);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[fileUploadOptimisticMutation, session],
	);

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
													void mutationApiCall(
														moveBookmarkToTrashOptimisticMutation.mutateAsync({
															data: item[0],
															isTrash: true,
														}),
														// eslint-disable-next-line promise/prefer-await-to-then
													).catch(() => {});
												}
											}}
											onMoveOutOfTrashClick={(data) => {
												void mutationApiCall(
													moveBookmarkToTrashOptimisticMutation.mutateAsync({
														data,
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
					return <DiscoverBookmarkCards />;
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

	const onAddBookmark = (url: string) => {
		// Check if URL already has a protocol (http:// or https://)
		const hasProtocol =
			url?.startsWith("http://") || url?.startsWith("https://");
		const finalUrl = hasProtocol ? url : `https://${url}`;
		void addBookmarkLogic(finalUrl);
	};

	// Handle unsupported actions for discover page
	const handleUnsupported = () => {
		errorToast("This action is not available on Discover.");
	};

	if (isNil(session) && !isDiscoverPage) {
		return <div />;
	}

	return (
		<>
			<DashboardLayout
				categoryId={isDiscoverPage ? DISCOVER_URL : CATEGORY_ID}
				onAddBookmark={isDiscoverPage ? handleUnsupported : onAddBookmark}
				onClearTrash={() => {
					void mutationApiCall(clearBookmarksInTrashMutation.mutateAsync());
				}}
				isClearingTrash={isClearingTrash}
				onDeleteCollectionClick={async () =>
					await onDeleteCollection(true, CATEGORY_ID as number)
				}
				setBookmarksView={(value, type) => {
					bookmarksViewApiLogic(value, type);
				}}
				uploadFileFromAddDropdown={isDiscoverPage ? handleUnsupported : onDrop}
				userId={session?.user?.id ?? ""}
			>
				{renderMainPaneContent()}
			</DashboardLayout>

			<SettingsModal />

			<ToastContainer />
		</>
	);
};

export default Dashboard;
