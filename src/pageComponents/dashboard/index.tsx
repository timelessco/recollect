import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { type Session, type UserIdentity } from "@supabase/supabase-js";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import omit from "lodash/omit";
import Dropzone from "react-dropzone";
import InfiniteScroll from "react-infinite-scroll-component";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import isNull from "lodash/isNull";
import uniqid from "uniqid";

import useAddBookmarkMinDataOptimisticMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation";
import useAddBookmarkScreenshotMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkScreenshotMutation";
import useClearBookmarksInTrashMutation from "../../async/mutationHooks/bookmarks/useClearBookmarksInTrashMutation";
import useDeleteBookmarksOptimisticMutation from "../../async/mutationHooks/bookmarks/useDeleteBookmarksOptimisticMutation";
import useMoveBookmarkToTrashOptimisticMutation from "../../async/mutationHooks/bookmarks/useMoveBookmarkToTrashOptimisticMutation";
import useAddCategoryOptimisticMutation from "../../async/mutationHooks/category/useAddCategoryOptimisticMutation";
import useAddCategoryToBookmarkMutation from "../../async/mutationHooks/category/useAddCategoryToBookmarkMutation";
import useAddCategoryToBookmarkOptimisticMutation from "../../async/mutationHooks/category/useAddCategoryToBookmarkOptimisticMutation";
import useDeleteCategoryOtimisticMutation from "../../async/mutationHooks/category/useDeleteCategoryOtimisticMutation";
import useUpdateCategoryOptimisticMutation from "../../async/mutationHooks/category/useUpdateCategoryOptimisticMutation";
import useFileUploadOptimisticMutation from "../../async/mutationHooks/files/useFileUploadOptimisticMutation";
import useUpdateSharedCategoriesOptimisticMutation from "../../async/mutationHooks/share/useUpdateSharedCategoriesOptimisticMutation";
import useAddTagToBookmarkMutation from "../../async/mutationHooks/tags/useAddTagToBookmarkMutation";
import useAddUserTagsMutation from "../../async/mutationHooks/tags/useAddUserTagsMutation";
import useRemoveTagFromBookmarkMutation from "../../async/mutationHooks/tags/useRemoveTagFromBookmarkMutation";
import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import useFetchBookmarksCount from "../../async/queryHooks/bookmarks/useFetchBookmarksCount";
import useFetchBookmarksView from "../../async/queryHooks/bookmarks/useFetchBookmarksView";
import useFetchPaginatedBookmarks from "../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../async/queryHooks/bookmarks/useSearchBookmarks";
import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import useFetchSharedCategories from "../../async/queryHooks/share/useFetchSharedCategories";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import useFetchUserTags from "../../async/queryHooks/userTags/useFetchUserTags";
import Modal from "../../components/modal";
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
	type BookmarksTagData,
	type BookmarkViewDataTypes,
	type CategoriesData,
	type ProfilesTableTypes,
	type SingleBookmarksPaginatedDataTypes,
	type SingleListData,
	type SupabaseSessionType,
	type UserTagsData,
} from "../../types/apiTypes";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { type FileType, type TagInputOption } from "../../types/componentTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import {
	acceptedFileTypes,
	ALL_BOOKMARKS_URL,
	DOCUMENTS_URL,
	IMAGES_URL,
	LINKS_URL,
	LOGIN_URL,
	SETTINGS_URL,
	TRASH_URL,
	UNCATEGORIZED_URL,
	URL_PATTERN,
	VIDEOS_URL,
} from "../../utils/constants";
import {
	generateVideoThumbnail,
	parseUploadFileName,
	uploadFileLimit,
} from "../../utils/helpers";
import { createClient } from "../../utils/supabaseClient";
import { errorToast, successToast } from "../../utils/toastMessages";
import NotFoundPage from "../notFoundPage";
import Settings from "../settings";

import AddModalContent from "./modals/addModalContent";
import SettingsModal from "./modals/settingsModal";
import ShareCategoryModal from "./modals/shareCategoryModal";
import WarningActionModal from "./modals/warningActionModal";
import SignedOutSection from "./signedOutSection";

// import CardSection from "./cardSection";
const CardSection = dynamic(() => import("./cardSection"), {
	ssr: false,
});

const DashboardLayout = dynamic(() => import("./dashboardLayout"), {
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
	const [showAddBookmarkModal, setShowAddBookmarkModal] =
		useState<boolean>(false);
	const [addedUrlData, setAddedUrlData] = useState<SingleListData>();
	const [selectedTag, setSelectedTag] = useState<TagInputOption[]>([]);
	const [isEdit, setIsEdit] = useState<boolean>(false);
	// const [setSelectedCategoryDuringAdd] = useState<SearchSelectOption | null>();
	const [deleteBookmarkId, setDeleteBookmarkId] = useState<
		number[] | undefined
	>(undefined);

	const infiniteScrollRef = useRef<HTMLDivElement>(null);

	const router = useRouter();
	const categorySlug = router?.asPath?.split("/")[1] || null;

	useEffect(() => {
		if (router?.pathname === "/") {
			void router.push(`/${ALL_BOOKMARKS_URL}`).catch(() => {});
		}
	}, [router, router?.pathname]);

	const toggleIsSortByLoading = useLoadersStore(
		(state) => state.toggleIsSortByLoading,
	);

	const toggleShareCategoryModal = useModalStore(
		(state) => state.toggleShareCategoryModal,
	);

	const showDeleteBookmarkWarningModal = useModalStore(
		(state) => state.showDeleteBookmarkWarningModal,
	);

	const toggleShowDeleteBookmarkWarningModal = useModalStore(
		(state) => state.toggleShowDeleteBookmarkWarningModal,
	);

	const showClearTrashWarningModal = useModalStore(
		(state) => state.showClearTrashWarningModal,
	);

	const toggleShowClearTrashWarningModal = useModalStore(
		(state) => state.toggleShowClearTrashWarningModal,
	);

	const setShareCategoryId = useMiscellaneousStore(
		(state) => state.setShareCategoryId,
	);

	useEffect(() => {
		if (!showAddBookmarkModal) {
			setIsEdit(false);
			setAddedUrlData(undefined);
			setSelectedTag([]);
		}
	}, [showAddBookmarkModal]);

	useEffect(() => {
		if (isNull(session?.user)) void router.push(`/${LOGIN_URL}`);
	}, [router, session]);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { isInNotFoundPage } = useIsInNotFoundPage();

	// react-query

	const { allCategories, isLoadingCategories, isFetchingCategories } =
		useFetchCategories();

	const { bookmarksCountData } = useFetchBookmarksCount();

	const { allBookmarksData, fetchNextPage } = useFetchPaginatedBookmarks();

	useSearchBookmarks();

	const { userTags } = useFetchUserTags();

	const { sharedCategoriesData } = useFetchSharedCategories();

	useFetchBookmarksView();

	const { userProfileData } = useFetchUserProfile();

	// Mutations

	const { deleteBookmarkOptismicMutation } =
		useDeleteBookmarksOptimisticMutation();

	const { moveBookmarkToTrashOptimisticMutation } =
		useMoveBookmarkToTrashOptimisticMutation();

	const { clearBookmarksInTrashMutation } = useClearBookmarksInTrashMutation();
	const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();

	const { addBookmarkMinDataOptimisticMutation } =
		useAddBookmarkMinDataOptimisticMutation();

	// tag mutation
	const { addUserTagsMutation } = useAddUserTagsMutation();

	const { addTagToBookmarkMutation } = useAddTagToBookmarkMutation();

	const { removeTagFromBookmarkMutation } = useRemoveTagFromBookmarkMutation();

	// category mutation
	const { addCategoryOptimisticMutation } = useAddCategoryOptimisticMutation();

	const { deleteCategoryOtimisticMutation } =
		useDeleteCategoryOtimisticMutation();

	const { addCategoryToBookmarkMutation } = useAddCategoryToBookmarkMutation();

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

	const { flattendPaginationBookmarkData } =
		useGetFlattendPaginationBookmarkData();

	const addBookmarkLogic = async (url: string) => {
		const currentCategory = find(
			allCategories?.data,
			(item) => item?.id === CATEGORY_ID,
		) as unknown as CategoriesData;

		// only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised
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
	let filteredUserTags = userTags?.data ? userTags?.data : [];

	if (selectedTag)
		for (const selectedItem of selectedTag) {
			filteredUserTags = filteredUserTags.filter(
				(index) => index?.id !== selectedItem?.value,
			);
		}

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
				// eslint-disable-next-line unicorn/consistent-function-scoping
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
			for (let index = 0; index < acceptedFiles?.length; index++) {
				if (
					acceptedFiles[index] &&
					acceptedFileTypes?.includes(acceptedFiles[index]?.type)
				) {
					let thumbnailBase64 = null;
					if (acceptedFiles[index]?.type?.includes("video")) {
						// if file is a video this gets its first frame as a png base64
						thumbnailBase64 = (await generateVideoThumbnail(
							acceptedFiles[0],
						)) as string;
					}

					if (uploadFileLimit(acceptedFiles[index]?.size)) {
						errorToast("File size is larger than 10mb", "fileSizeError");
					} else {
						const uploadFileNamePath = uniqid.time(
							"",
							`-${parseUploadFileName(acceptedFiles[index]?.name)}`,
						);
						mutationApiCall(
							fileUploadOptimisticMutation.mutateAsync({
								file: acceptedFiles[index],
								category_id: CATEGORY_ID,
								thumbnailBase64,
								uploadFileNamePath,
							}),
						).catch((error) => console.error(error));
					}
				} else {
					errorToast(`File type ${acceptedFiles[index]?.type} is not accepted`);
				}
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[fileUploadOptimisticMutation, session],
	);

	const renderAllBookmarkCards = () => (
		<>
			<div>
				{session ? (
					<>
						<div className="mx-auto w-full xl:w-1/2" />
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
											: "outline-none"
									}
								>
									<input {...getInputProps()} />
									<div
										className=""
										id="scrollableDiv"
										ref={infiniteScrollRef}
										style={{ height: "100vh", overflow: "auto" }}
									>
										<InfiniteScroll
											dataLength={flattendPaginationBookmarkData?.length}
											endMessage={
												<p className="pb-6 text-center">
													Life happens, save it.
												</p>
											}
											hasMore={hasMoreLogic()}
											loader={
												<div className="z-0 pb-6 text-center">
													{isDragActive ? "" : "Loading..."}
												</div>
											}
											next={fetchNextPage}
											scrollableTarget="scrollableDiv"
											style={{ overflow: "unset" }}
										>
											<CardSection
												deleteBookmarkId={deleteBookmarkId}
												isBookmarkLoading={
													addBookmarkMinDataOptimisticMutation?.isLoading
												}
												isOgImgLoading={
													addBookmarkScreenshotMutation?.isLoading
												}
												listData={flattendPaginationBookmarkData}
												onBulkBookmarkDelete={(
													bookmarkIds,
													isTrash,
													deleteForever,
												) => {
													if (!deleteForever) {
														// eslint-disable-next-line unicorn/no-array-for-each, @typescript-eslint/no-explicit-any
														bookmarkIds.forEach((item: any) => {
															const bookmarkId = Number.parseInt(
																item as string,
																10,
															);
															const delBookmarksData = find(
																flattendPaginationBookmarkData,
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
																).catch(() => {});
															} else {
																errorToast("Cannot delete other users uploads");
															}
														});
													} else {
														setDeleteBookmarkId(bookmarkIds);
														toggleShowDeleteBookmarkWarningModal();
													}
												}}
												onCategoryChange={(value, cat_id) => {
													const categoryId = cat_id;

													const currentCategory =
														find(
															allCategories?.data,
															(item) => item?.id === categoryId,
														) ??
														find(
															allCategories?.data,
															(item) => item?.id === CATEGORY_ID,
														);

													// only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncategorized
													const updateAccessCondition =
														find(
															currentCategory?.collabData,
															(item) =>
																item?.userEmail === session?.user?.email,
														)?.edit_access === true ||
														currentCategory?.user_id?.id === session?.user?.id;

													// eslint-disable-next-line unicorn/no-array-for-each, @typescript-eslint/no-misused-promises, @typescript-eslint/no-explicit-any
													value.forEach(async (item: any) => {
														const bookmarkId = item as string;

														const bookmarkCreatedUserId = find(
															flattendPaginationBookmarkData,
															(bookmarkItem) =>
																Number.parseInt(bookmarkId, 10) ===
																bookmarkItem?.id,
														)?.user_id?.id;
														if (bookmarkCreatedUserId === session?.user?.id) {
															await addCategoryToBookmarkOptimisticMutation.mutateAsync(
																{
																	category_id: categoryId,
																	bookmark_id: Number.parseInt(bookmarkId, 10),
																	// if user is changing to uncategoried then thay always have access
																	update_access:
																		isNull(categoryId) || !categoryId
																			? true
																			: updateAccessCondition,
																},
															);
														} else {
															errorToast(
																"You cannot move collaborators uploads",
															);
														}
													});
												}}
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
															moveBookmarkToTrashOptimisticMutation.mutateAsync(
																{
																	data: item[0],
																	isTrash: true,
																},
															),
														).catch(() => {});
													}
												}}
												onEditClick={(item) => {
													setAddedUrlData(item);
													setIsEdit(true);
													setShowAddBookmarkModal(true);
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
															// @ts-expect-error-Need to fix this
															find(
																allCategories?.data,
																(item) => item?.id === CATEGORY_ID,
															)?.collabData?.length > 1,
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
			</div>
			<Modal
				open={showAddBookmarkModal}
				setOpen={() => setShowAddBookmarkModal(false)}
				wrapperClassName="w-[50%] xl:w-[80%] p-4 rounded-lg"
			>
				<AddModalContent
					addExistingTag={async (tag) => {
						setSelectedTag([...selectedTag, tag[tag.length - 1]]);
						if (isEdit) {
							const userData = session?.user as unknown as UserIdentity;
							const bookmarkTagsData = {
								bookmark_id: addedUrlData?.id,
								tag_id: Number.parseInt(`${tag[tag.length - 1]?.value}`, 10),
								user_id: userData?.id,
							} as unknown as BookmarksTagData;

							await mutationApiCall(
								addTagToBookmarkMutation.mutateAsync({
									selectedData: bookmarkTagsData,
								}),
							);
						}
					}}
					addedTags={
						flattendPaginationBookmarkData?.find(
							(item) => item?.id === addedUrlData?.id,
						)?.addedTags ?? []
					}
					createTag={async (tagData) => {
						const userData = session?.user as unknown as UserIdentity;
						try {
							const data = (await mutationApiCall(
								addUserTagsMutation.mutateAsync({
									tagsData: { name: tagData[tagData.length - 1]?.label },
								}),
							)) as { data: UserTagsData[] };

							setSelectedTag([
								...selectedTag,
								// eslint-disable-next-line no-unsafe-optional-chaining
								...data?.data.map((item) => ({
									value: item?.id,
									label: item?.name,
								})),
							]);
							// on edit we are adding the new tag to bookmark as the bookmark is
							// will already be there when editing
							if (isEdit) {
								const bookmarkTagsData = {
									bookmark_id: addedUrlData?.id,
									tag_id: data?.data[0]?.id,
									user_id: userData?.id,
								} as unknown as BookmarksTagData;

								await mutationApiCall(
									addTagToBookmarkMutation.mutateAsync({
										selectedData: bookmarkTagsData,
									}),
								);
							}
						} catch {
							/* empty */
						}
					}}
					isCategoryChangeLoading={
						addCategoryToBookmarkMutation?.isLoading ||
						addCategoryToBookmarkOptimisticMutation?.isLoading
					}
					mainButtonText={isEdit ? "Update Bookmark" : "Add Bookmark"}
					onCategoryChange={async (value) => {
						if (isEdit) {
							const currentCategory =
								find(
									allCategories?.data,
									(item) => item?.id === value?.value,
								) ??
								find(allCategories?.data, (item) => item?.id === CATEGORY_ID);
							// only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised

							const updateAccessCondition =
								find(
									currentCategory?.collabData,
									(item) => item?.userEmail === session?.user?.email,
								)?.edit_access === true ||
								currentCategory?.user_id?.id === session?.user?.id;

							try {
								await mutationApiCall(
									addCategoryToBookmarkOptimisticMutation.mutateAsync({
										category_id: value?.value ? (value?.value as number) : null,
										bookmark_id: addedUrlData?.id as number,
										update_access:
											// if user is changing to uncategoried then thay always have access
											isNull(value?.value) || !value?.value
												? true
												: updateAccessCondition,
									}),
								);

								successToast("Collection updated");
							} catch (error) {
								errorToast(`Something went wrong: ${error}`);
							}
						} else {
							// setSelectedCategoryDuringAdd(value);
						}
					}}
					onCreateCategory={async (value) => {
						if (value?.label && userProfileData?.data) {
							const response = (await mutationApiCall(
								addCategoryOptimisticMutation.mutateAsync({
									name: value?.label,
									category_order: userProfileData?.data[0]
										?.category_order as number[],
								}),
							)) as { data: CategoriesData[] };

							try {
								// this is not optimistic as we need cat_id to add bookmark into that category
								// add the bookmark to the category after its created in add bookmark modal
								await mutationApiCall(
									addCategoryToBookmarkMutation.mutateAsync({
										category_id: response?.data[0]?.id,
										bookmark_id: addedUrlData?.id as number,
										// in this case user is creating the category , so they will have access
										update_access: true,
									}),
								);

								successToast("New collection created");
							} catch (error) {
								errorToast(`Something went wrong ${error}`);
							}
						} else {
							errorToast("Collection name is missing");
						}
					}}
					removeExistingTag={async (tag) => {
						setSelectedTag(
							selectedTag.filter((item) => item?.label !== tag?.label),
						);
						if (isEdit) {
							const delValue = tag.value;
							// const currentBookark = flattendPaginationBookmarkData?.filter(
							//   (item) => item?.id === addedUrlData?.id
							// ) as unknown as SingleListData[];

							const currentBookark = find(
								flattendPaginationBookmarkData,
								(item) => item?.id === addedUrlData?.id,
							) as SingleListData;
							const delData = find(
								currentBookark?.addedTags,
								(item) => item?.id === delValue || item?.name === delValue,
							) as unknown as BookmarksTagData;

							await mutationApiCall(
								removeTagFromBookmarkMutation.mutateAsync({
									selectedData: {
										tag_id: delData?.id as number,
										bookmark_id: currentBookark?.id,
									},
								}),
							);
						}
					}}
					showMainButton={false}
					urlData={addedUrlData}
					userId={session?.user?.id ?? ""}
					userTags={filteredUserTags}
				/>
			</Modal>
		</>
	);

	const renderMainPaneContent = () => {
		if (!isInNotFoundPage) {
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
		} else {
			return <NotFoundPage />;
		}
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
							deleteCategoryOtimisticMutation.mutateAsync({
								category_id: categoryId,
								category_order: userProfileData?.data[0]?.category_order,
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
			deleteCategoryOtimisticMutation,
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
						// only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised

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
									// if user is changing to uncategoried then thay always have access
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
							toggleShareCategoryModal();
							setShareCategoryId(categoryId);
							// code block
							break;
						default:
						// code block
					}
				}}
				onClearTrash={() => {
					toggleShowClearTrashWarningModal();
				}}
				onDeleteCollectionClick={async () =>
					await onDeleteCollection(true, CATEGORY_ID as number)
				}
				onIconColorChange={(color, id) => {
					void mutationApiCall(
						updateCategoryOptimisticMutation.mutateAsync({
							category_id: id ?? CATEGORY_ID,
							updateData: {
								icon_color: color,
							},
						}),
					);
				}}
				onIconSelect={(value, categoryId) => {
					void mutationApiCall(
						updateCategoryOptimisticMutation.mutateAsync({
							category_id: categoryId,
							updateData: { icon: value },
						}),
					);
				}}
				// onSearchEnterPress={onAddBookmark}
				onSearchEnterPress={() => {}}
				renderMainContent={renderMainPaneContent}
				setBookmarksView={(value, type) => {
					bookmarksViewApiLogic(value, type);
				}}
				updateCategoryName={(categoryId, name) => {
					void mutationApiCall(
						updateCategoryOptimisticMutation.mutateAsync({
							category_id: categoryId,
							updateData: {
								category_name: name,
							},
						}),
					);
				}}
				uploadFileFromAddDropdown={onDrop}
				userId={session?.user?.id ?? ""}
			/>
			<ShareCategoryModal />
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
			<WarningActionModal
				buttonText="Clear trash"
				isLoading={clearBookmarksInTrashMutation?.isLoading}
				onContinueCick={() => {
					void mutationApiCall(clearBookmarksInTrashMutation.mutateAsync());
					toggleShowClearTrashWarningModal();
				}}
				open={showClearTrashWarningModal}
				setOpen={toggleShowClearTrashWarningModal}
				warningText="Are you sure you want to delete ?"
			/>
			<ToastContainer />
		</>
	);
};

export default Dashboard;
