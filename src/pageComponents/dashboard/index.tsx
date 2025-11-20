import { useCallback, useEffect, useRef, useState } from "react";
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
import useAddCategoryOptimisticMutation from "../../async/mutationHooks/category/useAddCategoryOptimisticMutation";
import useAddCategoryToBookmarkOptimisticMutation from "../../async/mutationHooks/category/useAddCategoryToBookmarkOptimisticMutation";
import useDeleteCategoryOptimisticMutation from "../../async/mutationHooks/category/useDeleteCategoryOptimisticMutation";
import useUpdateCategoryOptimisticMutation from "../../async/mutationHooks/category/useUpdateCategoryOptimisticMutation";
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
import useFetchUserTags from "../../async/queryHooks/userTags/useFetchUserTags";
import { clipboardUpload } from "../../async/uploads/clipboard-upload";
import { fileUpload } from "../../async/uploads/file-upload";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useGetFlattendPaginationBookmarkData from "../../hooks/useGetFlattendPaginationBookmarkData";
import useIsInNotFoundPage from "../../hooks/useIsInNotFoundPage";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useModalStore,
	useSupabaseSession,
} from "../../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type ImgMetadataType,
	type ProfilesTableTypes,
	type SingleBookmarksPaginatedDataTypes,
	type SingleListData,
} from "../../types/apiTypes";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { type FileType } from "../../types/componentTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import {
	ALL_BOOKMARKS_URL,
	DOCUMENTS_URL,
	IMAGES_URL,
	LINKS_URL,
	SETTINGS_URL,
	TRASH_URL,
	TWEETS_URL,
	UNCATEGORIZED_URL,
	VIDEOS_URL,
} from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { errorToast, successToast } from "../../utils/toastMessages";
import { getCategorySlugFromRouter } from "../../utils/url";
import NotFoundPage from "../notFoundPage";
import Settings from "../settings";

import SettingsModal from "./modals/settingsModal";
import WarningActionModal from "./modals/warningActionModal";
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

	// move to zustand
	const [deleteBookmarkId, setDeleteBookmarkId] = useState<
		number[] | undefined
	>(undefined);

	const infiniteScrollRef = useRef<HTMLDivElement>(null);

	const router = useRouter();
	const categorySlug = getCategorySlugFromRouter(router);

	const toggleIsSortByLoading = useLoadersStore(
		(state) => state.toggleIsSortByLoading,
	);

	const showDeleteBookmarkWarningModal = useModalStore(
		(state) => state.showDeleteBookmarkWarningModal,
	);

	const toggleShowDeleteBookmarkWarningModal = useModalStore(
		(state) => state.toggleShowDeleteBookmarkWarningModal,
	);

	const searchText = useMiscellaneousStore((state) => state.searchText);
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { isInNotFoundPage } = useIsInNotFoundPage();

	// react-query

	const { allCategories, isLoadingCategories, isFetchingCategories } =
		useFetchCategories();

	const { bookmarksCountData } = useFetchBookmarksCount();

	const {
		allBookmarksData,
		fetchNextPage: fetchNextBookmarkPage,
		isAllBookmarksDataLoading,
	} = useFetchPaginatedBookmarks();

	const {
		flattenedSearchData,
		fetchNextPage: fetchNextSearchPage,
		hasNextPage: searchHasNextPage,
	} = useSearchBookmarks();

	// Determine if we're currently searching
	const isSearching = !isEmpty(searchText);
	const { userTags } = useFetchUserTags();

	const { sharedCategoriesData } = useFetchSharedCategories();

	useFetchBookmarksView();

	const { userProfileData, isLoading: isUserProfileLoading } =
		useFetchUserProfile();

	// Mutations

	const { deleteBookmarkOptismicMutation } =
		useDeleteBookmarksOptimisticMutation();

	const { moveBookmarkToTrashOptimisticMutation } =
		useMoveBookmarkToTrashOptimisticMutation();

	const { clearBookmarksInTrashMutation, isPending: isClearingTrash } =
		useClearBookmarksInTrashMutation();
	const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();

	const { addBookmarkMinDataOptimisticMutation } =
		useAddBookmarkMinDataOptimisticMutation();

	// tag mutation

	// category mutation
	const { addCategoryOptimisticMutation } = useAddCategoryOptimisticMutation();

	const { deleteCategoryOptimisticMutation } =
		useDeleteCategoryOptimisticMutation();

	const { addCategoryToBookmarkOptimisticMutation } =
		useAddCategoryToBookmarkOptimisticMutation();

	const { updateCategoryOptimisticMutation } =
		useUpdateCategoryOptimisticMutation();

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

	const { flattendPaginationBookmarkData } =
		useGetFlattendPaginationBookmarkData();

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

		if (typeof CATEGORY_ID === "number") {
			// to check that the same bookmark should not be there in the same category
			const existingBookmarkCheck = find(
				flattendPaginationBookmarkData,
				(item) => item?.url === url && item?.category_id === CATEGORY_ID,
			);

			if (existingBookmarkCheck) {
				errorToast("This bookmark already exists in the category");
				return;
			}
		}

		await mutationApiCall(
			addBookmarkMinDataOptimisticMutation.mutateAsync({
				url,
				category_id: CATEGORY_ID,
				update_access: updateAccessCondition,
			}),
		);
	};

	// any new tags created need not come in tag dropdown , this filter implements this
	const filteredUserTags = userTags?.data ? userTags?.data : [];

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

				if (value === "headlines") {
					return ["title", "cover", "info"];
				}

				return existingViewData;
			};

			if (currentCategory) {
				// for a collection
				if (isUserTheCategoryOwner) {
					// if user is the collection owner
					void mutationApiCall(
						updateCategoryOptimisticMutation.mutateAsync({
							category_id: CATEGORY_ID,
							updateData: {
								category_views: {
									...currentCategory?.category_views,
									cardContentViewArray: cardContentViewLogic(
										currentCategory?.category_views?.cardContentViewArray,
									),
									[updateValue]: value,
								},
							},
						}),
					);
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
			allBookmarksData?.pages?.length !== 0
				? (allBookmarksData?.pages[0] as SingleBookmarksPaginatedDataTypes)
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
				const count = bookmarksCountData?.data?.allBookmarks;
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
											userTags={filteredUserTags}
											bookmarksCountData={getBookmarkCountForCurrentPage(
												bookmarksCountData?.data ?? undefined,
												CATEGORY_ID as unknown as string | number | null,
											)}
											deleteBookmarkId={deleteBookmarkId}
											isBookmarkLoading={
												addBookmarkMinDataOptimisticMutation?.isPending
											}
											isLoading={
												isAllBookmarksDataLoading ||
												(isSearchLoading && flattenedSearchData.length === 0)
											}
											isLoadingProfile={isUserProfileLoading}
											isOgImgLoading={addBookmarkScreenshotMutation?.isPending}
											listData={
												isSearching
													? flattenedSearchData
													: flattendPaginationBookmarkData
											}
											onBulkBookmarkDelete={(
												bookmarkIds,
												isTrash,
												deleteForever,
											) => {
												const currentBookmarksData = isSearching
													? flattenedSearchData
													: flattendPaginationBookmarkData;

												if (!deleteForever) {
													for (const item of bookmarkIds) {
														const bookmarkId = Number.parseInt(
															item.toString(),
															10,
														);
														const delBookmarksData = find(
															currentBookmarksData,
															(delItem) => delItem?.id === bookmarkId,
														) as SingleListData;

														if (
															delBookmarksData?.user_id?.id ===
															session?.user?.id
														) {
															void mutationApiCall(
																moveBookmarkToTrashOptimisticMutation.mutateAsync(
																	{
																		data: delBookmarksData,
																		isTrash,
																	},
																),
																// eslint-disable-next-line promise/prefer-await-to-then
															).catch(() => {});
														} else {
															errorToast("Cannot delete other users uploads");
														}
													}
												} else {
													setDeleteBookmarkId(bookmarkIds);
													toggleShowDeleteBookmarkWarningModal();
												}
											}}
											onCategoryChange={async (value, cat_id) => {
												const categoryId = cat_id;
												const currentBookmarksData = isSearching
													? flattenedSearchData
													: flattendPaginationBookmarkData;

												const currentCategory =
													find(
														allCategories?.data,
														(item) => item?.id === categoryId,
													) ??
													find(
														allCategories?.data,
														(item) => item?.id === CATEGORY_ID,
													);

												const updateAccessCondition =
													find(
														currentCategory?.collabData,
														(item) => item?.userEmail === session?.user?.email,
													)?.edit_access === true ||
													currentCategory?.user_id?.id === session?.user?.id;
												for (const item of value) {
													const bookmarkId = item.toString();

													const bookmarkCreatedUserId = find(
														currentBookmarksData,
														(bookmarkItem) =>
															Number.parseInt(bookmarkId, 10) ===
															bookmarkItem?.id,
													)?.user_id?.id;

													if (bookmarkCreatedUserId === session?.user?.id) {
														await addCategoryToBookmarkOptimisticMutation.mutateAsync(
															{
																category_id: categoryId,
																bookmark_id: Number.parseInt(bookmarkId, 10),
																update_access:
																	isNull(categoryId) || !categoryId
																		? true
																		: updateAccessCondition,
															},
														);
														successToast("Category changed successfully");
													} else {
														errorToast("You cannot move collaborators uploads");
													}
												}
											}}
											isCategoryChangeLoading={
												addCategoryToBookmarkOptimisticMutation?.isPending
											}
											onDeleteClick={(item) => {
												setDeleteBookmarkId(
													item?.map((delItem) => delItem?.id),
												);

												if (CATEGORY_ID === TRASH_URL) {
													// delete bookmark if in trash
													toggleShowDeleteBookmarkWarningModal();
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
				case SETTINGS_URL:
					return <Settings />;
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
		const finalUrl = url?.includes("https://") ? url : `https://${url}`;
		void addBookmarkLogic(finalUrl);
	};

	const onDeleteCollection = useCallback(
		async (current: boolean, categoryId: number) => {
			if (
				!isNull(userProfileData?.data) &&
				userProfileData?.data[0]?.category_order
			) {
				const isDataPresentCheck =
					find(
						bookmarksCountData?.data?.categoryCount,
						(item) => item?.category_id === categoryId,
					)?.count === 0;

				const currentCategory = find(
					allCategories?.data,
					(item) => item?.id === categoryId,
				);

				if (currentCategory?.user_id?.id === session?.user?.id) {
					if (isDataPresentCheck) {
						await mutationApiCall(
							deleteCategoryOptimisticMutation.mutateAsync({
								category_id: categoryId,
								category_order: userProfileData?.data?.[0]?.category_order,
							}),
						);
					} else {
						errorToast(
							"This collection still has bookmarks, Please empty collection",
						);
					}
				} else {
					errorToast("Only collection owner can delete this collection");
				}

				// current - only push to home if user is deleting the category when user is currently in that category
				// isDataPresentCheck - only push to home after category get delete successfully
				if (isDataPresentCheck && current) {
					void router.push(`/${ALL_BOOKMARKS_URL}`);
				}
			}
		},
		[
			allCategories?.data,
			bookmarksCountData?.data?.categoryCount,
			deleteCategoryOptimisticMutation,
			router,
			session,
			userProfileData?.data,
		],
	);

	if (isNil(session)) {
		return <div />;
	}

	return (
		<>
			<DashboardLayout
				categoryId={CATEGORY_ID}
				onAddBookmark={onAddBookmark}
				isLoadingCategories={isLoadingCategories}
				onAddNewCategory={async (newCategoryName) => {
					if (!isNull(userProfileData?.data)) {
						const response = (await mutationApiCall(
							addCategoryOptimisticMutation.mutateAsync({
								name: newCategoryName,
								category_order: userProfileData?.data[0]?.category_order ?? [],
							}),
						)) as { data: CategoriesData[] };

						if (!isEmpty(response?.data)) {
							void router.push(`/${response?.data[0]?.category_slug}`);
						}
					}
				}}
				onBookmarksDrop={async (event) => {
					if (event?.isInternal === false) {
						const categoryId = Number.parseInt(
							event?.target?.key as string,
							10,
						);

						const currentCategory =
							find(allCategories?.data, (item) => item?.id === categoryId) ??
							find(allCategories?.data, (item) => item?.id === CATEGORY_ID);
						// only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncategorised

						const updateAccessCondition =
							find(
								currentCategory?.collabData,
								(item) => item?.userEmail === session?.user?.email,
							)?.edit_access === true ||
							currentCategory?.user_id?.id === session?.user?.id;

						// eslint-disable-next-line unicorn/no-array-for-each, @typescript-eslint/no-explicit-any
						await event?.items?.forEach(async (item: any) => {
							const bookmarkId = (await item.getText("text/plain")) as string;

							const bookmarkCreatedUserId = find(
								flattendPaginationBookmarkData,
								(bookmarkItem) =>
									Number.parseInt(bookmarkId, 10) === bookmarkItem?.id,
							)?.user_id?.id;

							if (bookmarkCreatedUserId === session?.user?.id) {
								if (!updateAccessCondition) {
									// if update access is not there then user cannot drag and drop anything into the collection
									errorToast("Cannot upload in other owners collection");
									return;
								}

								await addCategoryToBookmarkOptimisticMutation.mutateAsync({
									category_id: categoryId,
									bookmark_id: Number.parseInt(bookmarkId, 10),
									// if user is changing to uncategorised then thay always have access
									update_access: updateAccessCondition,
								});
							} else {
								errorToast("You cannot move collaborators uploads");
							}
						});
					}
				}}
				onCategoryOptionClick={async (value, current, categoryId) => {
					switch (value) {
						case "delete":
							await onDeleteCollection(current, categoryId);
							break;
						case "share":
							// code block
							break;
						default:
						// code block
					}
				}}
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
				uploadFileFromAddDropdown={onDrop}
				userId={session?.user?.id ?? ""}
			>
				{renderMainPaneContent()}
			</DashboardLayout>

			<SettingsModal />

			<WarningActionModal
				buttonText="Delete"
				isLoading={false}
				onContinueCick={() => {
					if (deleteBookmarkId && !isEmpty(deleteBookmarkId)) {
						toggleShowDeleteBookmarkWarningModal();
						const deleteData = deleteBookmarkId?.map((delItem) => {
							const idAsNumber = Number.parseInt(
								delItem as unknown as string,
								10,
							);

							const delBookmarkData = find(
								flattendPaginationBookmarkData,
								(item) => item?.id === idAsNumber,
							);

							const delBookmarkTitle = delBookmarkData?.title as string;
							const delBookmarkImgLink = delBookmarkData?.ogImage as string;
							const delBookmarkUrl = delBookmarkData?.url as string;

							return {
								id: idAsNumber,
								title: delBookmarkTitle,
								ogImage: delBookmarkImgLink,
								url: delBookmarkUrl,
								meta_data: delBookmarkData?.meta_data as ImgMetadataType,
							};
						});

						void mutationApiCall(
							deleteBookmarkOptismicMutation.mutateAsync({
								deleteData,
							}),
						);
					}

					setDeleteBookmarkId(undefined);
				}}
				open={showDeleteBookmarkWarningModal}
				setOpen={toggleShowDeleteBookmarkWarningModal}
				warningText="Are you sure you want to delete ?"
				// isLoading={deleteBookmarkMutation?.isLoading}
			/>
			<ToastContainer />
		</>
	);
};

export default Dashboard;
