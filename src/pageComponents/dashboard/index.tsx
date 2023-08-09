import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useSession } from "@supabase/auth-helpers-react";
import { type UserIdentity } from "@supabase/supabase-js";
import { find, flatten, isEmpty, isNull } from "lodash";
import { useDropzone } from "react-dropzone";
import InfiniteScroll from "react-infinite-scroll-component";
import { ToastContainer } from "react-toastify";

import Modal from "../../components/modal";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useModalStore,
} from "../../store/componentStore";
import {
	type BookmarksTagData,
	type CategoriesData,
	type ProfilesTableTypes,
	type SingleBookmarksPaginatedDataTypes,
	type SingleListData,
	type UserTagsData,
} from "../../types/apiTypes";
import { type FileType, type TagInputOption } from "../../types/componentTypes";
import {
	acceptedFileTypes,
	ALL_BOOKMARKS_URL,
	IMAGES_URL,
	LOGIN_URL,
	SETTINGS_URL,
	TRASH_URL,
	UNCATEGORIZED_URL,
	VIDEOS_URL,
} from "../../utils/constants";

import DashboardLayout from "./dashboardLayout";
import AddModalContent from "./modals/addModalContent";
import SignedOutSection from "./signedOutSection";

import "react-toastify/dist/ReactToastify.css";
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
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import { errorToast } from "../../utils/toastMessages";

import AddBookarkShortcutModal from "./modals/addBookmarkShortcutModal";
import ShareCategoryModal from "./modals/shareCategoryModal";
import WarningActionModal from "./modals/warningActionModal";

// import CardSection from "./cardSection";
const CardSection = dynamic(() => import("./cardSection"), {
	ssr: false,
});

const Dashboard = () => {
	const session = useSession();
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

	const toggleShowAddBookmarkShortcutModal = useModalStore(
		(state) => state.toggleShowAddBookmarkShortcutModal,
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
		const down = (event: KeyboardEvent) => {
			if (event.key === "k" && event.metaKey) {
				toggleShowAddBookmarkShortcutModal();
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!showAddBookmarkModal) {
			setIsEdit(false);
			setAddedUrlData(undefined);
			setSelectedTag([]);
		}
	}, [showAddBookmarkModal]);

	useEffect(() => {
		if (!session) void router.push(`/${LOGIN_URL}`);
	}, [router, session]);

	// react-query

	const { allCategories } = useFetchCategories();

	const { bookmarksCountData } = useFetchBookmarksCount();

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

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

	// const { deleteSharedCategoriesUserMutation } =
	//   useDeleteSharedCategoriesUserMutation();

	// const { updateSharedCategoriesUserAccessMutation } =
	//   useUpdateSharedCategoriesUserAccessMutation();

	const { updateSharedCategoriesOptimisticMutation } =
		useUpdateSharedCategoriesOptimisticMutation();

	// profiles table mutation

	const { updateUserProfileOptimisticMutation } =
		useUpdateUserProfileOptimisticMutation();

	// files mutation
	const { fileUploadOptimisticMutation } = useFileUploadOptimisticMutation();

	// END OF MUTATIONS ---------

	const flattendPaginationBookmarkData = flatten(
		allBookmarksData?.pages?.map((item) =>
			item?.data?.map((twoItem) => twoItem),
		),
	) as SingleListData[];

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
				session,
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

			if (currentCategory) {
				if (isUserTheCategoryOwner) {
					void mutationApiCall(
						updateCategoryOptimisticMutation.mutateAsync({
							category_id: CATEGORY_ID,
							updateData: {
								category_views: {
									...currentCategory?.category_views,
									[updateValue]: value,
								},
							},
							session,
						}),
					);
				} else {
					const sharedCategoriesId = !isNull(sharedCategoriesData?.data)
						? sharedCategoriesData?.data[0]?.id
						: undefined;

					if (sharedCategoriesId !== undefined) {
						void mutationApiCall(
							updateSharedCategoriesOptimisticMutation.mutateAsync({
								id: sharedCategoriesId,
								updateData: {
									category_views: {
										...currentCategory?.category_views,
										[updateValue]: value,
									},
								},
								session,
							}),
						);
					}
				}
			} else {
				// only if user is updating sortby, then scroll to top
				if (updateValue === "sortBy" && !isNull(infiniteScrollRef?.current)) {
					infiniteScrollRef?.current?.scrollTo(0, 0);
				}

				if (!isNull(userProfileData?.data)) {
					const data = {
						bookmarks_view: {
							...userProfileData?.data[0]?.bookmarks_view,
							[updateValue]: value,
						},
					} as ProfilesTableTypes;

					void mutationApiCall(
						updateUserProfileOptimisticMutation.mutateAsync({
							id: session?.user?.id as string,
							updateData: data,
							session,
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

			return true;
		}

		return true;
	};

	const onDrop = useCallback(
		(acceptedFiles: FileType[]) => {
			for (let index = 0; index < acceptedFiles?.length; index++) {
				if (
					acceptedFiles[index] &&
					acceptedFileTypes?.includes(acceptedFiles[index]?.type)
				) {
					mutationApiCall(
						fileUploadOptimisticMutation.mutateAsync({
							file: acceptedFiles[index],
							session,
							category_id: CATEGORY_ID,
						}),
					).catch((error) => console.error(error));
				} else {
					errorToast(`File type ${acceptedFiles[index]?.type} is not accepted`);
				}
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[fileUploadOptimisticMutation, session],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		noClick: true,
	});

	const renderAllBookmarkCards = () => (
		<>
			<div className="">
				{session ? (
					<>
						<div className="mx-auto w-full lg:w-1/2" />
						<div
							className=""
							id="scrollableDiv"
							ref={infiniteScrollRef}
							style={{ height: "calc(100vh - 63.5px)", overflow: "auto" }}
						>
							<InfiniteScroll
								dataLength={flattendPaginationBookmarkData?.length}
								endMessage={
									<p
										style={{
											height: 200,
											textAlign: "center",
											paddingTop: 100,
										}}
									>
										Life happens, save it.
									</p>
								}
								hasMore={hasMoreLogic()}
								loader={
									<div
										style={{
											height: 200,
											textAlign: "center",
											paddingTop: 100,
											zIndex: 0,
										}}
									>
										{isDragActive ? "" : "Loading..."}
									</div>
								}
								next={fetchNextPage}
								scrollableTarget="scrollableDiv"
							>
								<div
									{...getRootProps()}
									className={
										isDragActive
											? " absolute z-10 h-full w-full bg-gray-800 opacity-50"
											: ""
									}
								>
									<input {...getInputProps()} />
									<CardSection
										deleteBookmarkId={deleteBookmarkId}
										isBookmarkLoading={
											addBookmarkMinDataOptimisticMutation?.isLoading
										}
										isOgImgLoading={addBookmarkScreenshotMutation?.isLoading}
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
													void mutationApiCall(
														moveBookmarkToTrashOptimisticMutation.mutateAsync({
															data: delBookmarksData,
															isTrash,
															session,
														}),
													).catch(() => {});
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
											// only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised

											const updateAccessCondition =
												find(
													currentCategory?.collabData,
													(item) => item?.userEmail === session?.user?.email,
												)?.edit_access === true ||
												currentCategory?.user_id?.id === session?.user?.id;

											// eslint-disable-next-line unicorn/no-array-for-each, @typescript-eslint/no-misused-promises, @typescript-eslint/no-explicit-any
											value.forEach(async (item: any) => {
												const bookmarkId = item as string;

												await addCategoryToBookmarkOptimisticMutation.mutateAsync(
													{
														category_id: categoryId,
														bookmark_id: Number.parseInt(bookmarkId, 10),
														// if user is changing to uncategoried then thay always have access
														update_access: updateAccessCondition,
														session,
													},
												);
											});
										}}
										onDeleteClick={(item) => {
											setDeleteBookmarkId(item?.map((delItem) => delItem?.id));

											if (CATEGORY_ID === TRASH_URL) {
												// delete bookmark if in trash
												toggleShowDeleteBookmarkWarningModal();
											} else if (!isEmpty(item) && item?.length > 0) {
												// if not in trash then move bookmark to trash
												void mutationApiCall(
													moveBookmarkToTrashOptimisticMutation.mutateAsync({
														data: item[0],
														isTrash: true,
														session,
													}),
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
													session,
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
								</div>
							</InfiniteScroll>
						</div>
					</>
				) : (
					<SignedOutSection />
				)}
			</div>
			<Modal
				open={showAddBookmarkModal}
				setOpen={() => setShowAddBookmarkModal(false)}
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
									session,
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
									userData,
									tagsData: { name: tagData[tagData.length - 1]?.label },
									session,
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
										session,
									}),
								);
							}
						} catch {
							/* empty */
						}
					}}
					isCategoryChangeLoading={addCategoryToBookmarkMutation?.isLoading}
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

							await mutationApiCall(
								addCategoryToBookmarkOptimisticMutation.mutateAsync({
									category_id: value?.value ? (value?.value as number) : null,
									bookmark_id: addedUrlData?.id as number,
									update_access:
										// if user is changing to uncategoried then thay always have access
										isNull(value?.value) || !value?.value
											? true
											: updateAccessCondition,
									session,
								}),
							);
						} else {
							// setSelectedCategoryDuringAdd(value);
						}
					}}
					onCreateCategory={async (value) => {
						if (
							value?.label &&
							!isNull(userProfileData?.data) &&
							userProfileData?.data[0]?.category_order
						) {
							const response = (await mutationApiCall(
								addCategoryOptimisticMutation.mutateAsync({
									user_id: session?.user?.id as string,
									name: value?.label,
									category_order: userProfileData?.data[0]?.category_order,
									session,
								}),
							)) as { data: CategoriesData[] };

							// this is not optimistic as we need cat_id to add bookmark into that category
							// add the bookmark to the category after its created in add bookmark modal
							await mutationApiCall(
								addCategoryToBookmarkMutation.mutateAsync({
									category_id: response?.data[0]?.id,
									bookmark_id: addedUrlData?.id as number,
									// in this case user is creating the category , so they will have access
									update_access: true,
									session,
								}),
							);
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
									session,
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
		switch (categorySlug) {
			case SETTINGS_URL:
				return <div className="p-6">Settings page</div>;
			case IMAGES_URL:
				return renderAllBookmarkCards();
			case VIDEOS_URL:
				return renderAllBookmarkCards();
			default:
				return renderAllBookmarkCards();
		}
	};

	return (
		<>
			<DashboardLayout
				categoryId={CATEGORY_ID}
				onAddNewCategory={async (newCategoryName) => {
					if (!isNull(userProfileData?.data)) {
						const response = (await mutationApiCall(
							addCategoryOptimisticMutation.mutateAsync({
								user_id: session?.user?.id as string,
								name: newCategoryName,
								category_order: userProfileData?.data[0]?.category_order ?? [],
								session,
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

							await addCategoryToBookmarkOptimisticMutation.mutateAsync({
								category_id: categoryId,
								bookmark_id: Number.parseInt(bookmarkId, 10),
								// if user is changing to uncategoried then thay always have access
								update_access: updateAccessCondition,
								session,
							});
						});
					}
				}}
				onCategoryOptionClick={async (value, current, categoryId) => {
					switch (value) {
						case "delete":
							if (
								!isNull(userProfileData?.data) &&
								userProfileData?.data[0]?.category_order
							) {
								if (isEmpty(flattendPaginationBookmarkData)) {
									await mutationApiCall(
										deleteCategoryOtimisticMutation.mutateAsync({
											category_id: categoryId,
											category_order: userProfileData?.data[0]?.category_order,
											session,
										}),
									);
								} else {
									errorToast(
										"This collection still has bookmarks, Please empty collection",
									);
								}
							}

							// only push to home if user is deleting the category when user is currently in that category
							if (current) {
								void router.push(`/${ALL_BOOKMARKS_URL}`);
							}

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
				onIconColorChange={(color, id) => {
					void mutationApiCall(
						updateCategoryOptimisticMutation.mutateAsync({
							category_id: id ?? CATEGORY_ID,
							updateData: {
								icon_color: color,
							},
							session,
						}),
					);
				}}
				onIconSelect={(value, categoryId) => {
					void mutationApiCall(
						updateCategoryOptimisticMutation.mutateAsync({
							category_id: categoryId,
							updateData: { icon: value },
							session,
						}),
					);
				}}
				onNavAddClick={() => toggleShowAddBookmarkShortcutModal()}
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
							session,
						}),
					);
				}}
				userId={session?.user?.id ?? ""}
				// onShareClick={() => {
				//   if (CATEGORY_ID && !isNull(CATEGORY_ID) && CATEGORY_ID !== "trash") {
				//     toggleShareCategoryModal();
				//     setShareCategoryId(CATEGORY_ID as number);
				//   }
				// }}
			/>
			<ShareCategoryModal />
			<AddBookarkShortcutModal
				isAddBookmarkLoading={false}
				onAddBookmark={(url) => {
					const finalUrl = url?.includes("https://") ? url : `https://${url}`;
					void addBookmarkLogic(finalUrl);

					toggleShowAddBookmarkShortcutModal();
				}}
			/>
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
							return {
								id: idAsNumber,
								title: delBookmarkTitle,
								ogImage: delBookmarkImgLink,
							};
						});

						void mutationApiCall(
							deleteBookmarkOptismicMutation.mutateAsync({
								deleteData,
								session,
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
					void mutationApiCall(
						clearBookmarksInTrashMutation.mutateAsync({
							user_id: session?.user?.id,
							session,
						}),
					);
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
