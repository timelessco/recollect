import { useSession } from "@supabase/auth-helpers-react";
import type { UserIdentity } from "@supabase/supabase-js";
import { find, flatten, isEmpty, isNull } from "lodash";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { ToastContainer } from "react-toastify";

import Modal from "../../components/modal";
import {
  useLoadersStore,
  useMiscellaneousStore,
  useModalStore,
} from "../../store/componentStore";
import type {
  BookmarksTagData,
  CategoriesData,
  ProfilesTableTypes,
  SingleBookmarksPaginatedDataTypes,
  SingleListData,
  UserTagsData,
} from "../../types/apiTypes";
import type { TagInputOption } from "../../types/componentTypes";
import {
  ALL_BOOKMARKS_URL,
  LOGIN_URL,
  TRASH_URL,
  UNCATEGORIZED_URL,
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
import type {
  BookmarksSortByTypes,
  BookmarksViewTypes,
  BookmarkViewCategories,
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
  const [showAddBookmarkModal, setShowAddBookmarkModal] = // move to zudstand
    useState<boolean>(false);
  const [addedUrlData, setAddedUrlData] = useState<SingleListData>();
  const [selectedTag, setSelectedTag] = useState<TagInputOption[]>([]);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  // const [setSelectedCategoryDuringAdd] = useState<SearchSelectOption | null>();
  const [deleteBookmarkId, setDeleteBookmarkId] = useState<number | undefined>(
    undefined,
  );

  const infiniteScrollRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    if (router?.pathname === "/") {
      router.push(`/${ALL_BOOKMARKS_URL}`).catch(() => {});
    }
  }, [router, router?.pathname]);

  const toggleIsSortByLoading = useLoadersStore(
    state => state.toggleIsSortByLoading,
  );

  const toggleShareCategoryModal = useModalStore(
    state => state.toggleShareCategoryModal,
  );

  const toggleShowAddBookmarkShortcutModal = useModalStore(
    state => state.toggleShowAddBookmarkShortcutModal,
  );

  const showDeleteBookmarkWarningModal = useModalStore(
    state => state.showDeleteBookmarkWarningModal,
  );

  const toggleShowDeleteBookmarkWarningModal = useModalStore(
    state => state.toggleShowDeleteBookmarkWarningModal,
  );

  const showClearTrashWarningModal = useModalStore(
    state => state.showClearTrashWarningModal,
  );

  const toggleShowClearTrashWarningModal = useModalStore(
    state => state.toggleShowClearTrashWarningModal,
  );

  const setShareCategoryId = useMiscellaneousStore(
    state => state.setShareCategoryId,
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && e.metaKey) {
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
    if (!session) router.push(`/${LOGIN_URL}`)?.catch(() => {});
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

  // END OF MUTATIONS ---------

  const addBookmarkLogic = async (url: string) => {
    const currentCategory = find(
      allCategories?.data,
      item => item?.id === CATEGORY_ID,
    ) as unknown as CategoriesData;

    // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised
    // if cat_id not number then user is not updated in a category , so access will always be true
    const updateAccessCondition =
      typeof CATEGORY_ID === "number"
        ? find(
            currentCategory?.collabData,
            item => item?.userEmail === session?.user?.email,
          )?.edit_access === true ||
          currentCategory?.user_id?.id === session?.user?.id
        : true;

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

  selectedTag?.forEach(selectedItem => {
    filteredUserTags = filteredUserTags.filter(
      i => i?.id !== selectedItem?.value,
    );
  });

  const bookmarksViewApiLogic = (
    value: string[] | number[] | BookmarksViewTypes | BookmarksSortByTypes,
    type: BookmarkViewCategories,
  ) => {
    const currentCategory = find(
      allCategories?.data,
      item => item?.id === CATEGORY_ID,
    );

    const isUserTheCategoryOwner =
      session?.user?.id === currentCategory?.user_id?.id;

    const mutationCall = (updateValue: string) => {
      if (updateValue === "sortBy") {
        toggleIsSortByLoading();
      }

      if (currentCategory) {
        if (isUserTheCategoryOwner) {
          mutationApiCall(
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
          )?.catch(() => {});
        } else {
          const id = !isNull(sharedCategoriesData?.data)
            ? sharedCategoriesData?.data[0]?.id
            : undefined;

          if (id !== undefined) {
            mutationApiCall(
              updateSharedCategoriesOptimisticMutation.mutateAsync({
                id,
                updateData: {
                  category_views: {
                    ...currentCategory?.category_views,
                    [updateValue]: value,
                  },
                },
                session,
              }),
            )?.catch(() => {});
          }
        }
      } else {
        // only if user is updating sortby, then scroll to top
        if (updateValue === "sortBy") {
          if (!isNull(infiniteScrollRef?.current)) {
            infiniteScrollRef?.current?.scrollTo(0, 0);
          }
        }

        if (!isNull(userProfileData?.data)) {
          const data = {
            bookmarks_view: {
              ...userProfileData?.data[0]?.bookmarks_view,
              [updateValue]: value,
            },
          } as ProfilesTableTypes;

          mutationApiCall(
            updateUserProfileOptimisticMutation.mutateAsync({
              id: session?.user?.id as string,
              updateData: data,
              session,
            }),
          )?.catch(() => {});
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

  const flattendPaginationBookmarkData = flatten(
    allBookmarksData?.pages?.map(item => item?.data?.map(twoItem => twoItem)),
  ) as SingleListData[];

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
          item => item?.category_id === CATEGORY_ID,
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
      return true;
    }
    return true;
  };

  const renderAllBookmarkCards = () => {
    return (
      <>
        <div className="">
          {session ? (
            <>
              <div className="mx-auto w-full lg:w-1/2" />
              <div
                id="scrollableDiv"
                className=""
                style={{ height: "calc(100vh - 63.5px)", overflow: "auto" }}
                ref={infiniteScrollRef}
              >
                <InfiniteScroll
                  dataLength={flattendPaginationBookmarkData?.length}
                  next={fetchNextPage}
                  hasMore={hasMoreLogic()}
                  // className="px-6"
                  // className="px-2"
                  loader={
                    <div
                      style={{
                        height: 200,
                        textAlign: "center",
                        paddingTop: 100,
                      }}
                    >
                      Loading...
                    </div>
                  }
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
                  scrollableTarget="scrollableDiv"
                >
                  <CardSection
                    isBookmarkLoading={
                      addBookmarkMinDataOptimisticMutation?.isLoading
                    }
                    isOgImgLoading={addBookmarkScreenshotMutation?.isLoading}
                    deleteBookmarkId={deleteBookmarkId}
                    showAvatar={
                      // only show for a collab category
                      !!(
                        CATEGORY_ID &&
                        !isNull(CATEGORY_ID) &&
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        find(
                          allCategories?.data,
                          item => item?.id === CATEGORY_ID,
                        )?.collabData?.length > 1
                      )
                    }
                    userId={session?.user?.id || ""}
                    // isLoading={isAllBookmarksDataLoading}
                    listData={flattendPaginationBookmarkData}
                    onDeleteClick={item => {
                      setDeleteBookmarkId(item?.id);

                      if (CATEGORY_ID === TRASH_URL) {
                        // delete bookmark if in trash
                        toggleShowDeleteBookmarkWarningModal();
                      } else {
                        // if not in trash then move bookmark to trash
                        mutationApiCall(
                          moveBookmarkToTrashOptimisticMutation.mutateAsync({
                            data: item,
                            isTrash: true,
                            session,
                          }),
                        ).catch(() => {});
                      }
                    }}
                    onEditClick={item => {
                      setAddedUrlData(item);
                      setIsEdit(true);
                      setShowAddBookmarkModal(true);
                    }}
                    onMoveOutOfTrashClick={data => {
                      mutationApiCall(
                        moveBookmarkToTrashOptimisticMutation.mutateAsync({
                          data,
                          isTrash: false,
                          session,
                        }),
                      )?.catch(() => {});
                    }}
                  />
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
            showMainButton={false}
            isCategoryChangeLoading={addCategoryToBookmarkMutation?.isLoading}
            userId={session?.user?.id || ""}
            mainButtonText={isEdit ? "Update Bookmark" : "Add Bookmark"}
            urlData={addedUrlData}
            userTags={filteredUserTags}
            addedTags={addedUrlData?.addedTags || []}
            createTag={async tagData => {
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
                  ...data?.data.map(item => {
                    return {
                      value: item?.id,
                      label: item?.name,
                    };
                  }),
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
              } catch (error) {
                /* empty */
              }
            }}
            removeExistingTag={async tag => {
              setSelectedTag(
                selectedTag.filter(item => item?.label !== tag?.label),
              );
              if (isEdit) {
                const delValue = tag.value;
                // const currentBookark = flattendPaginationBookmarkData?.filter(
                //   (item) => item?.id === addedUrlData?.id
                // ) as unknown as SingleListData[];

                const currentBookark = find(
                  flattendPaginationBookmarkData,
                  item => item?.id === addedUrlData?.id,
                ) as SingleListData;
                const delData = find(
                  currentBookark?.addedTags,
                  item => item?.id === delValue || item?.name === delValue,
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
            addExistingTag={async tag => {
              setSelectedTag([...selectedTag, tag[tag.length - 1]]);
              if (isEdit) {
                const userData = session?.user as unknown as UserIdentity;
                const bookmarkTagsData = {
                  bookmark_id: addedUrlData?.id,
                  tag_id: parseInt(`${tag[tag.length - 1]?.value}`, 10),
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
            onCategoryChange={async value => {
              if (isEdit) {
                const currentCategory =
                  find(
                    allCategories?.data,
                    item => item?.id === value?.value,
                  ) ||
                  find(allCategories?.data, item => item?.id === CATEGORY_ID);
                // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised

                const updateAccessCondition =
                  find(
                    currentCategory?.collabData,
                    item => item?.userEmail === session?.user?.email,
                  )?.edit_access === true ||
                  currentCategory?.user_id?.id === session?.user?.id;

                await mutationApiCall(
                  addCategoryToBookmarkOptimisticMutation.mutateAsync({
                    category_id: value?.value ? (value?.value as number) : null,
                    bookmark_id: addedUrlData?.id as number,
                    update_access:
                      isNull(value?.value) || !value?.value
                        ? true
                        : updateAccessCondition, // if user is changing to uncategoried then thay always have access
                    session,
                  }),
                );
              } else {
                // setSelectedCategoryDuringAdd(value);
              }
            }}
            onCreateCategory={async value => {
              if (
                value?.label &&
                !isNull(userProfileData?.data) &&
                userProfileData?.data[0]?.category_order
              ) {
                const res = (await mutationApiCall(
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
                    category_id: res?.data[0]?.id,
                    bookmark_id: addedUrlData?.id as number,
                    update_access: true, // in this case user is creating the category , so they will have access
                    session,
                  }),
                );
              } else {
                errorToast("Category name is missing");
              }
            }}
          />
        </Modal>
      </>
    );
  };

  return (
    <>
      <DashboardLayout
        categoryId={CATEGORY_ID}
        userId={session?.user?.id || ""}
        renderMainContent={renderAllBookmarkCards}
        onNavAddClick={() => toggleShowAddBookmarkShortcutModal()}
        onBookmarksDrop={async e => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (e?.isInternal === false) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const categoryId = parseInt(e?.target?.key as string, 10);

            const currentCategory =
              find(allCategories?.data, item => item?.id === categoryId) ||
              find(allCategories?.data, item => item?.id === CATEGORY_ID);
            // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised

            const updateAccessCondition =
              find(
                currentCategory?.collabData,
                item => item?.userEmail === session?.user?.email,
              )?.edit_access === true ||
              currentCategory?.user_id?.id === session?.user?.id;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await e?.items?.forEach(async (item: any) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
              const bookmarkId = (await item.getText("text/plain")) as string;

              await addCategoryToBookmarkOptimisticMutation.mutateAsync({
                category_id: categoryId,
                bookmark_id: parseInt(bookmarkId, 10),
                update_access: updateAccessCondition, // if user is changing to uncategoried then thay always have access
                session,
              });
            });
          }
        }}
        onAddNewCategory={async newCategoryName => {
          if (!isNull(userProfileData?.data)) {
            const res = (await mutationApiCall(
              addCategoryOptimisticMutation.mutateAsync({
                user_id: session?.user?.id as string,
                name: newCategoryName,
                category_order: userProfileData?.data[0]?.category_order || [],
                session,
              }),
            )) as { data: CategoriesData[] };

            if (!isEmpty(res?.data)) {
              router.push(`/${res?.data[0]?.category_slug}`)?.catch(() => {});
            }
          }
        }}
        onCategoryOptionClick={async (value, current, id) => {
          switch (value) {
            case "delete":
              if (
                !isNull(userProfileData?.data) &&
                userProfileData?.data[0]?.category_order
              ) {
                await mutationApiCall(
                  deleteCategoryOtimisticMutation.mutateAsync({
                    category_id: id,
                    category_order: userProfileData?.data[0]?.category_order,
                    session,
                  }),
                );
              }

              // only push to home if user is deleting the category when user is currently in that category
              if (current) {
                router.push(`/${ALL_BOOKMARKS_URL}`)?.catch(() => {});
              }
              break;
            case "share":
              toggleShareCategoryModal();
              setShareCategoryId(id);
              // code block
              break;
            default:
            // code block
          }
        }}
        // onShareClick={() => {
        //   if (CATEGORY_ID && !isNull(CATEGORY_ID) && CATEGORY_ID !== "trash") {
        //     toggleShareCategoryModal();
        //     setShareCategoryId(CATEGORY_ID as number);
        //   }
        // }}
        onClearTrash={() => {
          toggleShowClearTrashWarningModal();
        }}
        onIconSelect={(value, id) => {
          mutationApiCall(
            updateCategoryOptimisticMutation.mutateAsync({
              category_id: id,
              updateData: { icon: value },
              session,
            }),
          )?.catch(() => {});
        }}
        setBookmarksView={(value, type) => {
          bookmarksViewApiLogic(value, type);
        }}
      />
      <ShareCategoryModal
      // userId={session?.user?.id || ""}
      // onPublicSwitch={(isPublic, categoryId) => {
      //   mutationApiCall(
      //     updateCategoryOptimisticMutation.mutateAsync({
      //       category_id: categoryId,
      //       updateData: { is_public: isPublic },
      //       session,
      //     }),
      //   )?.catch(() => {});
      // }}
      // onDeleteUserClick={id => {
      //   mutationApiCall(
      //     deleteSharedCategoriesUserMutation.mutateAsync({
      //       id,
      //       session,
      //     }),
      //   )?.catch(() => {});
      // }}
      // updateSharedCategoriesUserAccess={async (id, value) => {
      //   const res = (await mutationApiCall(
      //     updateSharedCategoriesUserAccessMutation.mutateAsync({
      //       id,
      //       updateData: { edit_access: !!parseInt(value, 10) },
      //       session,
      //     }),
      //   )) as { error: Error };

      //   if (isNull(res?.error)) {
      //     successToast("User role changed");
      //   }
      // }}
      />
      <AddBookarkShortcutModal
        isAddBookmarkLoading={false}
        onAddBookmark={url => {
          addBookmarkLogic(url)?.catch(() => {});

          toggleShowAddBookmarkShortcutModal();
        }}
      />
      <WarningActionModal
        open={showDeleteBookmarkWarningModal}
        setOpen={toggleShowDeleteBookmarkWarningModal}
        // isLoading={deleteBookmarkMutation?.isLoading}
        isLoading={false}
        buttonText="Delete"
        warningText="Are you sure you want to delete ?"
        onContinueCick={() => {
          if (deleteBookmarkId) {
            toggleShowDeleteBookmarkWarningModal();

            mutationApiCall(
              deleteBookmarkOptismicMutation.mutateAsync({
                id: deleteBookmarkId,
                session,
              }),
            )?.catch(() => {});
          }
          setDeleteBookmarkId(undefined);
        }}
      />
      <WarningActionModal
        open={showClearTrashWarningModal}
        setOpen={toggleShowClearTrashWarningModal}
        isLoading={clearBookmarksInTrashMutation?.isLoading}
        buttonText="Clear trash"
        warningText="Are you sure you want to delete ?"
        onContinueCick={() => {
          mutationApiCall(
            clearBookmarksInTrashMutation.mutateAsync({
              user_id: session?.user?.id,
              session,
            }),
          )?.catch(() => {});
          toggleShowClearTrashWarningModal();
        }}
      />
      <ToastContainer />
    </>
  );
};

export default Dashboard;
