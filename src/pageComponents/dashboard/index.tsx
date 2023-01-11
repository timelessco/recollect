import { UserIdentity } from '@supabase/supabase-js';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useRef, useState } from 'react';
import {
  BookmarksTagData,
  SingleBookmarksPaginatedDataTypes,
  SingleListData,
  UserTagsData,
} from '../../types/apiTypes';
import { signOut } from '../../async/supabaseCrudHelpers';
import CardSection from './cardSection';
import {
  ALL_BOOKMARKS_URL,
  LOGIN_URL,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from '../../utils/constants';
import {
  CategoryIdUrlTypes,
  SearchSelectOption,
  TagInputOption,
} from '../../types/componentTypes';
import SignedOutSection from './signedOutSection';
import Modal from '../../components/modal';
import AddModalContent from './addModalContent';
import { find, flatten, isNull } from 'lodash';
import DashboardLayout from './dashboardLayout';
import {
  useLoadersStore,
  useMiscellaneousStore,
  useModalStore,
} from '../../store/componentStore';
import { useRouter } from 'next/router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { errorToast, successToast } from '../../utils/toastMessages';
import { mutationApiCall } from '../../utils/apiHelpers';
import ShareCategoryModal from './modals/shareCategoryModal';
import AddBookarkShortcutModal from './modals/addBookmarkShortcutModal';
import WarningActionModal from './modals/warningActionModal';
import {
  BookmarksSortByTypes,
  BookmarksViewTypes,
  BookmarkViewCategories,
} from '../../types/componentStoreTypes';
import InfiniteScroll from 'react-infinite-scroll-component';
import useFetchCategories from '../../async/queryHooks/category/useFetchCategories';
import useFetchBookmarksCount from '../../async/queryHooks/bookmarks/useFetchBookmarksCount';
import useFetchPaginatedBookmarks from '../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks';
import useSearchBookmarks from '../../async/queryHooks/bookmarks/useSearchBookmarks';
import useFetchUserTags from '../../async/queryHooks/userTags/useFetchUserTags';
import useFetchSharedCategories from '../../async/queryHooks/share/useFetchSharedCategories';
import useFetchBookmarksView from '../../async/queryHooks/bookmarks/useFetchBookmarksView';
import useFetchUserProfile from '../../async/queryHooks/user/useFetchUserProfile';
import useGetCurrentCategoryId from '../../hooks/useGetCurrentCategoryId';
import useDeleteBookmarksOptimisticMutation from '../../async/mutationHooks/bookmarks/useDeleteBookmarksOptimisticMutation';
import useMoveBookmarkToTrashOptimisticMutation from '../../async/mutationHooks/bookmarks/useMoveBookmarkToTrashOptimisticMutation';
import useClearBookmarksInTrashMutation from '../../async/mutationHooks/bookmarks/useClearBookmarksInTrashMutation';
import useAddBookmarkScreenshotMutation from '../../async/mutationHooks/bookmarks/useAddBookmarkScreenshotMutation';
import useAddBookmarkMinDataOptimisticMutation from '../../async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation';
import useAddUserTagsMutation from '../../async/mutationHooks/tags/useAddUserTagsMutation';
import useAddTagToBookmarkMutation from '../../async/mutationHooks/tags/useAddTagToBookmarkMutation';
import useRemoveTagFromBookmarkMutation from '../../async/mutationHooks/tags/useRemoveTagFromBookmarkMutation';
import useAddCategoryOptimisticMutation from '../../async/mutationHooks/category/useAddCategoryOptimisticMutation';
import useDeleteCategoryOtimisticMutation from '../../async/mutationHooks/category/useDeleteCategoryOtimisticMutation';
import useAddCategoryToBookmarkMutation from '../../async/mutationHooks/category/useAddCategoryToBookmarkMutation';
import useAddCategoryToBookmarkOptimisticMutation from '../../async/mutationHooks/category/useAddCategoryToBookmarkOptimisticMutation';
import useUpdateCategoryOptimisticMutation from '../../async/mutationHooks/category/useUpdateCategoryOptimisticMutation';
import useDeleteSharedCategoriesUserMutation from '../../async/mutationHooks/share/useDeleteSharedCategoriesUserMutation';
import useUpdateSharedCategoriesUserAccessMutation from '../../async/mutationHooks/share/useUpdateSharedCategoriesUserAccessMutation';
import useUpdateSharedCategoriesOptimisticMutation from '../../async/mutationHooks/share/useUpdateSharedCategoriesOptimisticMutation';
import useUpdateUserProfileOptimisticMutation from '../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation';

const Dashboard = () => {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [showAddBookmarkModal, setShowAddBookmarkModal] = // move to zudstand
    useState<boolean>(false);
  const [addedUrlData, setAddedUrlData] = useState<SingleListData>();
  const [selectedTag, setSelectedTag] = useState<TagInputOption[]>([]);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [url, setUrl] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCategoryDuringAdd, setSelectedCategoryDuringAdd] =
    useState<SearchSelectOption | null>();
  const [deleteBookmarkId, setDeleteBookmarkId] = useState<number | undefined>(
    undefined
  );

  const infiniteScrollRef = useRef(null);

  const router = useRouter();

  useEffect(() => {
    if (router?.pathname === '/') {
      router?.push(`/${ALL_BOOKMARKS_URL}`);
    }
  }, [router, router?.pathname]);

  const toggleIsSortByLoading = useLoadersStore(
    (state) => state.toggleIsSortByLoading
  );

  const toggleShareCategoryModal = useModalStore(
    (state) => state.toggleShareCategoryModal
  );

  const toggleShowAddBookmarkShortcutModal = useModalStore(
    (state) => state.toggleShowAddBookmarkShortcutModal
  );

  const showDeleteBookmarkWarningModal = useModalStore(
    (state) => state.showDeleteBookmarkWarningModal
  );

  const toggleShowDeleteBookmarkWarningModal = useModalStore(
    (state) => state.toggleShowDeleteBookmarkWarningModal
  );

  const showClearTrashWarningModal = useModalStore(
    (state) => state.showClearTrashWarningModal
  );

  const toggleShowClearTrashWarningModal = useModalStore(
    (state) => state.toggleShowClearTrashWarningModal
  );

  const setShareCategoryId = useMiscellaneousStore(
    (state) => state.setShareCategoryId
  );

  const addScreenshotBookmarkId = useMiscellaneousStore(
    (state) => state.addScreenshotBookmarkId
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && e.metaKey) {
        toggleShowAddBookmarkShortcutModal();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showAddBookmarkModal) {
      setIsEdit(false);
      setAddedUrlData(undefined);
      setSelectedTag([]);
      setUrl('');
      setSelectedCategoryDuringAdd(undefined);
    }
  }, [showAddBookmarkModal]);

  useEffect(() => {
    if (!session) router.push(`/${LOGIN_URL}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // react-query

  const { allCategories } = useFetchCategories();

  const { bookmarksCountData } = useFetchBookmarksCount();

  const { category_id } = useGetCurrentCategoryId();

  const { allBookmarksData, fetchNextPage, isAllBookmarksDataLoading } =
    useFetchPaginatedBookmarks();

  const {} = useSearchBookmarks();

  const { userTags } = useFetchUserTags();

  const { sharedCategoriesData } = useFetchSharedCategories();

  const {} = useFetchBookmarksView();

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

  const { deleteSharedCategoriesUserMutation } =
    useDeleteSharedCategoriesUserMutation();

  const { updateSharedCategoriesUserAccessMutation } =
    useUpdateSharedCategoriesUserAccessMutation();

  const { updateSharedCategoriesOptimisticMutation } =
    useUpdateSharedCategoriesOptimisticMutation();

  // profiles table mutation

  const { updateUserProfileOptimisticMutation } =
    useUpdateUserProfileOptimisticMutation();

  // END OF MUTATIONS ---------

  const addBookmarkLogic = async (url: string) => {
    setUrl(url);
    const currentCategory = find(
      allCategories?.data,
      (item) => item?.id === category_id
    );
    // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised
    // if cat_id not number then user is not updated in a category , so access will always be true
    const updateAccessCondition =
      typeof category_id === 'number'
        ? find(
            currentCategory?.collabData,
            (item) => item?.userEmail === session?.user?.email
          )?.edit_access === true ||
          currentCategory?.user_id?.id === session?.user?.id
        : true;

    await mutationApiCall(
      addBookmarkMinDataOptimisticMutation.mutateAsync({
        url: url,
        category_id: category_id,
        update_access: updateAccessCondition,
        session,
      })
    );
  };

  // any new tags created need not come in tag dropdown , this filter implements this
  let filteredUserTags = userTags?.data ? [...userTags?.data] : [];

  selectedTag?.forEach((selectedItem) => {
    filteredUserTags = filteredUserTags.filter(
      (i) => i?.id !== selectedItem?.value
    );
  });

  const bookmarksViewApiLogic = (
    value: string[] | number[] | BookmarksViewTypes | BookmarksSortByTypes,
    type: BookmarkViewCategories
  ) => {
    const currentCategory = find(
      allCategories?.data,
      (item) => item?.id === category_id
    );

    const isUserTheCategoryOwner =
      session?.user?.id === currentCategory?.user_id?.id;

    const mutationCall = (updateValue: string) => {
      if (updateValue === 'sortBy') {
        toggleIsSortByLoading();
      }

      if (currentCategory) {
        if (isUserTheCategoryOwner) {
          mutationApiCall(
            updateCategoryOptimisticMutation.mutateAsync({
              category_id: category_id,
              updateData: {
                category_views: {
                  ...currentCategory?.category_views,
                  [updateValue]: value,
                },
              },
              session,
            })
          );
        } else {
          mutationApiCall(
            updateSharedCategoriesOptimisticMutation.mutateAsync({
              id: sharedCategoriesData?.data[0]?.id,
              updateData: {
                category_views: {
                  ...currentCategory?.category_views,
                  [updateValue]: value,
                },
              },
              session,
            })
          );
        }
      } else {
        // only if user is updating sortby, then scroll to top
        if (updateValue === 'sortBy') {
          if (!isNull(infiniteScrollRef?.current)) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            infiniteScrollRef?.current?.scrollTo(0, 0);
          }
        }

        mutationApiCall(
          updateUserProfileOptimisticMutation.mutateAsync({
            id: session?.user?.id as string,
            updateData: {
              bookmarks_view: {
                ...userProfileData?.data[0]?.bookmarks_view,
                [updateValue]: value,
              },
            },
            session,
          })
        );
      }
    };

    switch (type) {
      case 'view':
        mutationCall('bookmarksView');
        break;
      case 'info':
        mutationCall('cardContentViewArray');
        break;
      case 'colums':
        mutationCall('moodboardColumns');
        break;
      case 'sort':
        mutationCall('sortBy');
        break;
      default:
        break;
    }
  };

  const flattendPaginationBookmarkData = flatten(
    allBookmarksData?.pages?.map((item) =>
      item?.data?.map((twoItem) => twoItem)
    )
  ) as SingleListData[];

  // tells if the latest paginated data is the end for total bookmark data based on current category
  const hasMoreLogic = (): boolean => {
    const firstPaginatedData =
      allBookmarksData?.pages?.length !== 0
        ? (allBookmarksData?.pages[0] as SingleBookmarksPaginatedDataTypes)
        : null;

    if (!isNull(firstPaginatedData)) {
      if (typeof category_id === 'number') {
        const totalBookmarkCountInCategory = find(
          bookmarksCountData?.data?.categoryCount,
          (item) => item?.category_id === category_id
        );
        return (
          totalBookmarkCountInCategory?.count !==
          flattendPaginationBookmarkData?.length
        );
      } else if (category_id === null) {
        const count = bookmarksCountData?.data?.allBookmarks;
        return count !== flattendPaginationBookmarkData?.length;
      } else if (category_id === TRASH_URL) {
        const count = bookmarksCountData?.data?.trash;

        return count !== flattendPaginationBookmarkData?.length;
      } else if (category_id === UNCATEGORIZED_URL) {
        const count = bookmarksCountData?.data?.uncategorized;

        return count !== flattendPaginationBookmarkData?.length;
      }
      return true;
    } else {
      return true;
    }
  };

  const renderAllBookmarkCards = () => {
    return (
      <>
        <div className="pl-4">
          {session ? (
            <>
              <div className="mx-auto w-full lg:w-1/2 px-4 sm:px-0"></div>
              <div
                id="scrollableDiv"
                style={{ height: 'calc(100vh - 46.5px)', overflow: 'auto' }}
                ref={infiniteScrollRef}
              >
                <InfiniteScroll
                  dataLength={flattendPaginationBookmarkData?.length}
                  next={fetchNextPage}
                  hasMore={hasMoreLogic()}
                  loader={
                    <div
                      style={{
                        height: 200,
                        textAlign: 'center',
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
                        textAlign: 'center',
                        paddingTop: 100,
                      }}
                    >
                      Bookmarks !
                    </p>
                  }
                  scrollableTarget="scrollableDiv"
                >
                  <CardSection
                    isBookmarkLoading={
                      addBookmarkMinDataOptimisticMutation?.isLoading
                    }
                    isOgImgLoading={addBookmarkScreenshotMutation?.isLoading}
                    addScreenshotBookmarkId={addScreenshotBookmarkId}
                    deleteBookmarkId={deleteBookmarkId}
                    showAvatar={
                      // only show for a collab category
                      category_id &&
                      !isNull(category_id) &&
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      find(
                        allCategories?.data,
                        (item) => item?.id === category_id
                      )?.collabData?.length > 1
                        ? true
                        : false
                    }
                    userId={session?.user?.id || ''}
                    isLoading={isAllBookmarksDataLoading}
                    listData={flattendPaginationBookmarkData}
                    onDeleteClick={async (item) => {
                      setDeleteBookmarkId(item?.id);
                      if (category_id === TRASH_URL) {
                        // delete bookmark if in trash
                        toggleShowDeleteBookmarkWarningModal();
                      } else {
                        // if not in trash then move bookmark to trash
                        await mutationApiCall(
                          moveBookmarkToTrashOptimisticMutation.mutateAsync({
                            data: item,
                            isTrash: true,
                            session,
                          })
                        );
                      }
                    }}
                    onEditClick={(item) => {
                      setAddedUrlData(item);
                      setIsEdit(true);
                      setShowAddBookmarkModal(true);
                    }}
                    onMoveOutOfTrashClick={async (data) => {
                      await mutationApiCall(
                        moveBookmarkToTrashOptimisticMutation.mutateAsync({
                          data,
                          isTrash: false,
                          session,
                        })
                      );
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
            userId={session?.user?.id || ''}
            categoryId={category_id}
            urlString={url}
            mainButtonText={isEdit ? 'Update Bookmark' : 'Add Bookmark'}
            urlData={addedUrlData}
            userTags={filteredUserTags}
            addedTags={addedUrlData?.addedTags || []}
            createTag={async (tagData) => {
              const userData = session?.user as unknown as UserIdentity;
              try {
                const data = (await mutationApiCall(
                  addUserTagsMutation.mutateAsync({
                    userData,
                    tagsData: { name: tagData[tagData?.length - 1]?.label },
                    session,
                  })
                )) as { data: UserTagsData[] };

                setSelectedTag([
                  ...selectedTag,
                  ...data?.data.map((item) => {
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

                  mutationApiCall(
                    addTagToBookmarkMutation.mutateAsync({
                      selectedData: bookmarkTagsData,
                      session,
                    })
                  );
                }
              } catch (error) {}
            }}
            removeExistingTag={async (tag) => {
              setSelectedTag(
                selectedTag.filter((item) => item?.label !== tag?.label)
              );
              if (isEdit) {
                const delValue = tag.value;
                // const currentBookark = flattendPaginationBookmarkData?.filter(
                //   (item) => item?.id === addedUrlData?.id
                // ) as unknown as SingleListData[];

                const currentBookark = find(
                  flattendPaginationBookmarkData,
                  (item) => item?.id === addedUrlData?.id
                ) as SingleListData;
                const delData = find(
                  currentBookark?.addedTags,
                  (item) => item?.id === delValue || item?.name === delValue
                ) as unknown as BookmarksTagData;

                mutationApiCall(
                  removeTagFromBookmarkMutation.mutateAsync({
                    selectedData: {
                      tag_id: delData?.id as number,
                      bookmark_id: currentBookark?.id,
                    },
                    session,
                  })
                );
              }
            }}
            addExistingTag={async (tag) => {
              setSelectedTag([...selectedTag, tag[tag?.length - 1]]);
              if (isEdit) {
                const userData = session?.user as unknown as UserIdentity;
                const bookmarkTagsData = {
                  bookmark_id: addedUrlData?.id,
                  tag_id: parseInt(`${tag[tag.length - 1]?.value}`),
                  user_id: userData?.id,
                } as unknown as BookmarksTagData;

                mutationApiCall(
                  addTagToBookmarkMutation.mutateAsync({
                    selectedData: bookmarkTagsData,
                    session,
                  })
                );
              }
            }}
            onCategoryChange={async (value) => {
              if (isEdit) {
                const currentCategory =
                  find(
                    allCategories?.data,
                    (item) => item?.id === value?.value
                  ) ||
                  find(allCategories?.data, (item) => item?.id === category_id);
                // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised

                const updateAccessCondition =
                  find(
                    currentCategory?.collabData,
                    (item) => item?.userEmail === session?.user?.email
                  )?.edit_access === true ||
                  currentCategory?.user_id?.id === session?.user?.id;

                await mutationApiCall(
                  addCategoryToBookmarkOptimisticMutation.mutateAsync({
                    category_id: value?.value
                      ? (value?.value as number)
                      : (null as null),
                    bookmark_id: addedUrlData?.id as number,
                    update_access:
                      isNull(value?.value) || !value?.value
                        ? true
                        : updateAccessCondition, // if user is changing to uncategoried then thay always have access
                    session,
                  })
                );
              } else {
                setSelectedCategoryDuringAdd(value);
              }
            }}
            onCreateCategory={async (value) => {
              if (value?.label) {
                const res = await mutationApiCall(
                  addCategoryOptimisticMutation.mutateAsync({
                    user_id: session?.user?.id as string,
                    name: value?.label,
                    category_order: userProfileData?.data[0]?.category_order,
                    session,
                  })
                );
                // this is not optimistic as we need cat_id to add bookmark into that category
                // add the bookmark to the category after its created in add bookmark modal
                mutationApiCall(
                  addCategoryToBookmarkMutation.mutateAsync({
                    category_id: res?.data[0]?.id,
                    bookmark_id: addedUrlData?.id as number,
                    update_access: true, // in this case user is creating the category , so they will have access
                    session,
                  })
                );
              } else {
                errorToast('Category name is missing');
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
        categoryId={category_id as CategoryIdUrlTypes}
        isAddInputLoading={false}
        userId={session?.user?.id || ''}
        renderMainContent={renderAllBookmarkCards}
        userImg={session?.user?.user_metadata?.avatar_url}
        userName={session?.user?.user_metadata?.name || session?.user?.email}
        userEmail={session?.user?.user_metadata?.email}
        onNavAddClick={() => toggleShowAddBookmarkShortcutModal()}
        onBookmarksDrop={async (e) => {
          const categoryId = parseInt(e?.target?.key);
          // const bookmarkId = await e.items[0].getText('text/plain');

          const currentCategory =
            find(allCategories?.data, (item) => item?.id === categoryId) ||
            find(allCategories?.data, (item) => item?.id === category_id);
          // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised

          const updateAccessCondition =
            find(
              currentCategory?.collabData,
              (item) => item?.userEmail === session?.user?.email
            )?.edit_access === true ||
            currentCategory?.user_id?.id === session?.user?.id;

          await e?.items?.forEach(async (item: any) => {
            const bookmarkId = await item.getText('text/plain');

            await addCategoryToBookmarkOptimisticMutation.mutateAsync({
              category_id: categoryId,
              bookmark_id: parseInt(bookmarkId),
              update_access: updateAccessCondition, // if user is changing to uncategoried then thay always have access
              session,
            });
          });
        }}
        onSignOutClick={async () => {
          await signOut(supabase);
          // setSession(undefined);
          // router.push(`/${LOGIN_URL}`);
        }}
        // onSigninClick={() => {
        //   signInWithOauth();
        // }}
        onAddBookmark={async (url) => {
          await addBookmarkLogic(url);
        }}
        onAddNewCategory={async (newCategoryName) => {
          const res = await mutationApiCall(
            addCategoryOptimisticMutation.mutateAsync({
              user_id: session?.user?.id as string,
              name: newCategoryName,
              category_order: userProfileData?.data[0]?.category_order,
              session,
            })
          );

          router.push(`/${res?.data[0]?.category_slug}`);
        }}
        onCategoryOptionClick={async (value, current, id) => {
          switch (value) {
            case 'delete':
              mutationApiCall(
                deleteCategoryOtimisticMutation.mutateAsync({
                  category_id: id,
                  category_order: userProfileData?.data[0]?.category_order,
                  session,
                })
              );

              // only push to home if user is deleting the category when user is currently in that category
              if (current) {
                router.push(`/${ALL_BOOKMARKS_URL}`);
              }
              break;
            case 'share':
              toggleShareCategoryModal();
              setShareCategoryId(id);
              // code block
              break;
            default:
            // code block
          }
        }}
        onShareClick={() => {
          if (category_id && !isNull(category_id) && category_id !== 'trash') {
            toggleShareCategoryModal();
            setShareCategoryId(category_id as number);
          }
        }}
        onClearTrash={async () => {
          toggleShowClearTrashWarningModal();
        }}
        onIconSelect={async (value, id) => {
          mutationApiCall(
            updateCategoryOptimisticMutation.mutateAsync({
              category_id: id,
              updateData: { icon: value },
              session,
            })
          );
        }}
        setBookmarksView={async (value, type) => {
          bookmarksViewApiLogic(value, type);
        }}
      />
      <ShareCategoryModal
        userId={session?.user?.id || ''}
        onPublicSwitch={(isPublic, categoryId) => {
          mutationApiCall(
            updateCategoryOptimisticMutation.mutateAsync({
              category_id: categoryId,
              updateData: { is_public: isPublic },
              session,
            })
          );
        }}
        onDeleteUserClick={(id) => {
          mutationApiCall(
            deleteSharedCategoriesUserMutation.mutateAsync({
              id: id,
              session,
            })
          );
        }}
        updateSharedCategoriesUserAccess={async (id, value) => {
          const res = await mutationApiCall(
            updateSharedCategoriesUserAccessMutation.mutateAsync({
              id: id,
              updateData: { edit_access: parseInt(value) ? true : false },
              session,
            })
          );

          if (isNull(res?.error)) {
            successToast('User role changed');
          }
        }}
      />
      <AddBookarkShortcutModal
        isAddBookmarkLoading={false}
        onAddBookmark={(url) => {
          addBookmarkLogic(url);

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
        onContinueCick={async () => {
          if (deleteBookmarkId) {
            toggleShowDeleteBookmarkWarningModal();

            await mutationApiCall(
              deleteBookmarkOptismicMutation.mutateAsync({
                id: deleteBookmarkId,
                session,
              })
            );
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
        onContinueCick={async () => {
          await mutationApiCall(
            clearBookmarksInTrashMutation.mutateAsync({
              user_id: session?.user?.id,
              session,
            })
          );
          toggleShowClearTrashWarningModal();
        }}
      />
      <ToastContainer />
    </>
  );
};

export default Dashboard;
