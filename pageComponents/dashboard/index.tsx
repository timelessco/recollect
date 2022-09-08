import { Session, UserIdentity } from '@supabase/supabase-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { AxiosResponse } from 'axios';
import { useEffect, useState } from 'react';
import { BookmarksTagData, SingleListData } from '../../types/apiTypes';
import {
  addBookmarkMinData,
  addBookmarkScreenshot,
  addCategoryToBookmark,
  addData,
  addTagToBookmark,
  addUserCategory,
  addUserTags,
  deleteData,
  deleteSharedCategoriesUser,
  deleteUserCategory,
  fetchBookmakrsData,
  fetchCategoriesData,
  fetchSharedCategoriesData,
  fetchUserTags,
  // getBookmarkScrappedData,
  getCurrentUserSession,
  removeTagFromBookmark,
  signInWithOauth,
  signOut,
  updateCategory,
  updateProfilesTable,
  updateSharedCategoriesUserAccess,
} from '../../utils/supabaseCrudHelpers';
import CardSection from './cardSection';
import {
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  USER_TAGS_KEY,
} from '../../utils/constants';
import { SearchSelectOption, TagInputOption } from '../../types/componentTypes';
import SignedOutSection from './signedOutSection';
import Modal from '../../components/modal';
import AddModalContent from './addModalContent';
import { find, isEmpty, isNull } from 'lodash';
import DashboardLayout from './dashboardLayout';
import {
  useLoadersStore,
  useMiscellaneousStore,
  useModalStore,
} from '../../store/componentStore';
import AddCategoryModal from './addCategoryModal';
import { useRouter } from 'next/router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { errorToast } from '../../utils/toastMessages';
import { mutationApiCall } from '../../utils/apiHelpers';
import { getCategoryIdFromSlug } from '../../utils/helpers';
import ShareCategoryModal from './shareCategoryModal';

const Dashboard = () => {
  const [session, setSession] = useState<Session>();
  const [showAddBookmarkModal, setShowAddBookmarkModal] = // move to zudstand
    useState<boolean>(false);
  const [addedUrlData, setAddedUrlData] = useState<SingleListData>();
  const [selectedTag, setSelectedTag] = useState<TagInputOption[]>([]);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [url, setUrl] = useState<string>('');
  const [selectedCategoryDuringAdd, setSelectedCategoryDuringAdd] =
    useState<SearchSelectOption | null>();
  const [addScreenshotBookmarkId, setAddScreenshotBookmarkId] =
    useState(undefined);
  const [deleteBookmarkId, setDeleteBookmarkId] = useState<number | undefined>(
    undefined
  );

  const router = useRouter();

  const toggleIsAddBookmarkModalButtonLoading = useLoadersStore(
    (state) => state.toggleIsAddBookmarkModalButtonLoading
  );

  const toggleIsDeleteBookmarkLoading = useLoadersStore(
    (state) => state.toggleIsDeleteBookmarkLoading
  );

  const toggleAddCategoryModal = useModalStore(
    (state) => state.toggleAddCategoryModal
  );

  const toggleShareCategoryModal = useModalStore(
    (state) => state.toggleShareCategoryModal
  );

  const setShareCategoryId = useMiscellaneousStore(
    (state) => state.setShareCategoryId
  );

  const fetchUserSession = async () => {
    const currentSession = await getCurrentUserSession();
    setSession(currentSession);
  };

  useEffect(() => {
    if (!showAddBookmarkModal) {
      setIsEdit(false);
      setAddedUrlData(undefined);
      setSelectedTag([]);
      setUrl('');
      setSelectedCategoryDuringAdd(undefined);
    }
  }, [showAddBookmarkModal]);

  // TODO: this is bad pattern fix this
  useEffect(() => {
    fetchUserSession();
    updateProfilesTable();
    setTimeout(() => {
      fetchUserSession();
    }, 2000);
  }, []);

  // react-query

  // Access the client
  const queryClient = useQueryClient();

  // Queries
  const { data: allCategories } = useQuery(
    [CATEGORIES_KEY, session?.user?.id],
    () =>
      fetchCategoriesData(session?.user?.id || '', session?.user?.email || '')
  );

  const { data: allBookmarksData } = useQuery(
    [BOOKMARKS_KEY, session?.user?.id],
    () => fetchBookmakrsData('null')
  );

  const category_slug = router?.asPath?.split('/')[1] || null;
  const category_id =
    getCategoryIdFromSlug(category_slug, allCategories?.data) || null;
  const { data: bookmarksData, isLoading: isBookmarksLoading } = useQuery(
    [BOOKMARKS_KEY, category_id],
    () => fetchBookmakrsData(category_id)
  );

  const { data: userTags } = useQuery([USER_TAGS_KEY], () => fetchUserTags());

  const {} = useQuery([SHARED_CATEGORIES_TABLE_NAME], () =>
    fetchSharedCategoriesData()
  );

  // Mutations
  const addBookmarkMutation = useMutation(addData, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
    },
  });
  const deleteBookmarkMutation = useMutation(deleteData, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
      setDeleteBookmarkId(undefined);
    },
  });

  const addBookmarkScreenshotMutation = useMutation(addBookmarkScreenshot, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
      setAddScreenshotBookmarkId(undefined);
    },
  });

  const addBookmarkMinDataMutation = useMutation(addBookmarkMinData, {
    onSuccess: (res: unknown) => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const data = res?.data?.data[0];
      const ogImg = data?.ogImage;
      if (!ogImg || isEmpty(ogImg)) {
        addBookmarkScreenshotMutation.mutate({ url: data?.url, id: data?.id });
        setAddScreenshotBookmarkId(data?.id);
      }
    },
  });

  // tag mutation
  const addUserTagsMutation = useMutation(addUserTags, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([USER_TAGS_KEY]);
    },
  });

  const addTagToBookmarkMutation = useMutation(addTagToBookmark, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
    },
  });

  const removeTagFromBookmarkMutation = useMutation(removeTagFromBookmark, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
    },
  });

  // category mutation

  const addCategoryMutation = useMutation(addUserCategory, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
    },
  });

  const deleteCategoryMutation = useMutation(deleteUserCategory, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
    },
  });

  const addCategoryToBookmarkMutation = useMutation(addCategoryToBookmark, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
    },
  });

  const updateCategoryMutation = useMutation(updateCategory, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
    },
  });

  // share category mutation
  const deleteSharedCategoriesUserMutation = useMutation(
    deleteSharedCategoriesUser,
    {
      onSuccess: () => {
        // Invalidate and refetch
        queryClient.invalidateQueries([SHARED_CATEGORIES_TABLE_NAME]);
        queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
      },
    }
  );

  const updateSharedCategoriesUserAccessMutation = useMutation(
    updateSharedCategoriesUserAccess,
    {
      onSuccess: () => {
        // Invalidate and refetch
        queryClient.invalidateQueries([SHARED_CATEGORIES_TABLE_NAME]);
      },
    }
  );

  // // gets scrapped data
  // const addItem = async (item: string) => {
  //   setShowAddBookmarkModal(true);

  //   try {
  //     const apiRes = (await getBookmarkScrappedData(item)) as AxiosResponse;

  //     const scrapperData = apiRes.data.data.scrapperData;
  //     const screenshotUrl = apiRes.data.data.screenShot;

  //     const urlData = {
  //       title: scrapperData?.title,
  //       description: scrapperData?.description,
  //       url: scrapperData?.url,
  //       ogImage: scrapperData?.OgImage,
  //       screenshot: screenshotUrl,
  //     } as SingleListData;

  //     setAddedUrlData(urlData);
  //   } catch (err) {
  //     console.error('err ,', err);
  //   } finally {
  //     console.log('finally');
  //   }
  // };

  // any new tags created need not come in tag dropdown , this filter implements this
  let filteredUserTags = userTags?.data ? [...userTags?.data] : [];

  selectedTag?.forEach((selectedItem) => {
    filteredUserTags = filteredUserTags.filter(
      (i) => i?.id !== selectedItem?.value
    );
  });

  const renderAllBookmarkCards = () => {
    return (
      <>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {session ? (
            <>
              <div className="mx-auto w-full lg:w-1/2 px-4 sm:px-0"></div>
              <CardSection
                isOgImgLoading={addBookmarkScreenshotMutation?.isLoading}
                addScreenshotBookmarkId={addScreenshotBookmarkId}
                deleteBookmarkId={deleteBookmarkId}
                showAvatar={
                  // only show for a collab category
                  category_id &&
                  !isNull(category_id) &&
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  find(allCategories?.data, (item) => item?.id === category_id)
                    ?.collabData?.length > 1
                    ? true
                    : false
                }
                userId={session?.user?.id || ''}
                isLoading={isBookmarksLoading && !bookmarksData}
                listData={
                  !isNull(category_id)
                    ? bookmarksData?.data || []
                    : allBookmarksData?.data || []
                }
                onDeleteClick={async (item) => {
                  toggleIsDeleteBookmarkLoading();
                  setDeleteBookmarkId(item?.id);
                  await mutationApiCall(
                    deleteBookmarkMutation.mutateAsync(item)
                  );
                  toggleIsDeleteBookmarkLoading();
                }}
                onEditClick={(item) => {
                  setAddedUrlData(item);
                  setIsEdit(true);
                  setShowAddBookmarkModal(true);
                }}
              />
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
            userId={session?.user?.id || ''}
            categoryId={category_id}
            urlString={url}
            mainButtonText={isEdit ? 'Update Bookmark' : 'Add Bookmark'}
            urlData={addedUrlData}
            // userTags={userTags?.data}
            userTags={filteredUserTags}
            addedTags={addedUrlData?.addedTags || []}
            addBookmark={async () => {
              const userData = session?.user as unknown as UserIdentity;
              if (!isEdit) {
                toggleIsAddBookmarkModalButtonLoading();

                try {
                  const data = await addBookmarkMutation.mutateAsync({
                    userData,
                    urlData: addedUrlData,
                  });

                  const bookmarkTagsData = selectedTag?.map((item) => {
                    return {
                      bookmark_id: data?.data[0]?.id,
                      tag_id: parseInt(`${item?.value}`),
                      user_id: userData?.id,
                    };
                  }) as unknown as Array<BookmarksTagData>;
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const bookmarkTagData =
                    await addTagToBookmarkMutation.mutateAsync({
                      selectedData: bookmarkTagsData,
                    });

                  const selectedCategoryId =
                    selectedCategoryDuringAdd?.value === undefined
                      ? (category_id as number | null)
                      : selectedCategoryDuringAdd?.value;

                  const currentCategory = find(
                    allCategories?.data,
                    (item) => item?.id === selectedCategoryId
                  );
                  // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised
                  const updateAccessCondition =
                    !selectedCategoryId ||
                    find(
                      currentCategory?.collabData,
                      (item) => item?.userEmail === session?.user?.email
                    )?.edit_access === true ||
                    currentCategory?.user_id?.id === session?.user?.id;

                  await mutationApiCall(
                    addCategoryToBookmarkMutation.mutateAsync({
                      category_id: selectedCategoryId,
                      bookmark_id: data?.data[0]?.id as number,
                      update_access: updateAccessCondition,
                    })
                  );
                } catch (error) {
                  const err = error as unknown as string;
                  errorToast(err);
                }
              }
              toggleIsAddBookmarkModalButtonLoading();
              setShowAddBookmarkModal(false);
            }}
            createTag={async (tagData) => {
              const userData = session?.user as unknown as UserIdentity;
              try {
                const data = await addUserTagsMutation.mutateAsync({
                  userData,
                  tagsData: { name: tagData[tagData?.length - 1]?.label },
                });
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

                  addTagToBookmarkMutation.mutate({
                    selectedData: bookmarkTagsData,
                  });
                }
              } catch (error) {}
            }}
            removeExistingTag={async (tag) => {
              setSelectedTag(
                selectedTag.filter((item) => item?.label !== tag?.label)
              );
              if (isEdit) {
                const delValue = tag.value;
                const currentBookark = bookmarksData?.data?.filter(
                  (item) => item?.id === addedUrlData?.id
                ) as unknown as SingleListData[];
                const delData = find(
                  currentBookark[0]?.addedTags,
                  (item) => item?.id === delValue || item?.name === delValue
                ) as unknown as BookmarksTagData;

                try {
                  removeTagFromBookmarkMutation.mutate({
                    selectedData: delData,
                  });
                } catch (error) {
                  const err = error as unknown as string;
                  errorToast(err);
                }
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

                addTagToBookmarkMutation.mutate({
                  selectedData: bookmarkTagsData,
                });
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
                  addCategoryToBookmarkMutation.mutateAsync({
                    category_id: value?.value
                      ? (value?.value as number)
                      : (null as null),
                    bookmark_id: addedUrlData?.id as number,
                    update_access: updateAccessCondition,
                  })
                );
              } else {
                setSelectedCategoryDuringAdd(value);
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
        isAddInputLoading={addBookmarkMinDataMutation?.isLoading}
        userId={session?.user?.id || ''}
        bookmarksData={bookmarksData?.data} // make this dependant on react-query
        renderMainContent={renderAllBookmarkCards}
        userImg={session?.user?.user_metadata?.avatar_url}
        userName={session?.user?.user_metadata?.name}
        userEmail={session?.user?.user_metadata?.email}
        onSignOutClick={() => {
          signOut();
          setSession(undefined);
        }}
        onSigninClick={() => {
          signInWithOauth();
        }}
        onAddCategoryClick={toggleAddCategoryModal}
        onDeleteCategoryClick={(id) => {
          mutationApiCall(
            deleteCategoryMutation.mutateAsync({
              category_id: id,
            })
          );
        }}
        onAddBookmark={async (url) => {
          setUrl(url);
          // addItem(url);
          // await addBookmarkMinData({ url });
          const currentCategory = find(
            allCategories?.data,
            (item) => item?.id === category_id
          );
          // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncatogorised
          const updateAccessCondition =
            find(
              currentCategory?.collabData,
              (item) => item?.userEmail === session?.user?.email
            )?.edit_access === true ||
            currentCategory?.user_id?.id === session?.user?.id;
          mutationApiCall(
            addBookmarkMinDataMutation.mutateAsync({
              url: url,
              category_id: category_id,
              update_access: updateAccessCondition,
            })
          );
        }}
        onShareClick={(id) => {
          toggleShareCategoryModal();
          setShareCategoryId(parseInt(id));
        }}
      />
      <AddCategoryModal
        onAddNewCategory={(newCategoryName) => {
          mutationApiCall(
            addCategoryMutation.mutateAsync({
              user_id: session?.user?.id as string,
              name: newCategoryName,
            })
          );
        }}
      />
      <ShareCategoryModal
        userId={session?.user?.id || ''}
        onPublicSwitch={(isPublic, categoryId) => {
          mutationApiCall(
            updateCategoryMutation.mutateAsync({
              category_id: categoryId,
              updateData: { is_public: isPublic },
            })
          );
        }}
        onDeleteUserClick={(id) => {
          mutationApiCall(
            deleteSharedCategoriesUserMutation.mutateAsync({
              id: id,
            })
          );
        }}
        updateSharedCategoriesUserAccess={(id, value) =>
          mutationApiCall(
            updateSharedCategoriesUserAccessMutation.mutateAsync({
              id: id,
              updateData: { edit_access: parseInt(value) ? true : false },
            })
          )
        }
      />
      <ToastContainer />
    </>
  );
};

export default Dashboard;
