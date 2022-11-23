import { Session, UserIdentity } from '@supabase/supabase-js';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
// import { AxiosResponse } from 'axios';
import { useEffect, useRef, useState } from 'react';
import {
  BookmarksTagData,
  CategoriesData,
  FetchSharedCategoriesData,
  ProfilesTableTypes,
  SingleListData,
  UserTagsData,
} from '../../types/apiTypes';
import {
  addBookmarkMinData,
  addBookmarkScreenshot,
  addCategoryToBookmark,
  addTagToBookmark,
  addUserCategory,
  addUserTags,
  clearBookmarksInTrash,
  deleteData,
  deleteSharedCategoriesUser,
  deleteUserCategory,
  fetchBookmakrsData,
  fetchBookmarksViews,
  fetchCategoriesData,
  fetchSharedCategoriesData,
  fetchUserProfiles,
  fetchUserTags,
  // getBookmarkScrappedData,
  getCurrentUserSession,
  moveBookmarkToTrash,
  removeTagFromBookmark,
  signInWithOauth,
  signOut,
  updateCategory,
  updateProfilesTable,
  updateSharedCategoriesUserAccess,
  updateUserProfile,
} from '../../utils/supabaseCrudHelpers';
import CardSection from './cardSection';
import {
  ALL_BOOKMARKS_URL,
  BOOKMARKS_KEY,
  BOOKMARKS_VIEW,
  CATEGORIES_KEY,
  LOGIN_URL,
  PAGINATION_LIMIT,
  SHARED_CATEGORIES_TABLE_NAME,
  TRASH_URL,
  USER_PROFILE,
  USER_TAGS_KEY,
} from '../../utils/constants';
import { SearchSelectOption, TagInputOption } from '../../types/componentTypes';
import SignedOutSection from './signedOutSection';
import Modal from '../../components/modal';
import AddModalContent from './addModalContent';
import { find, flatten, isEmpty, isNull } from 'lodash';
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
import { getCategoryIdFromSlug } from '../../utils/helpers';
import ShareCategoryModal from './modals/shareCategoryModal';
import AddBookarkShortcutModal from './modals/addBookmarkShortcutModal';
import WarningActionModal from './modals/warningActionModal';
import {
  BookmarksSortByTypes,
  BookmarksViewTypes,
  BookmarkViewCategories,
} from '../../types/componentStoreTypes';
import slugify from 'slugify';
import InfiniteScroll from 'react-infinite-scroll-component';

const Dashboard = () => {
  const [session, setSession] = useState<Session>();
  const [showAddBookmarkModal, setShowAddBookmarkModal] = // move to zudstand
    useState<boolean>(false);
  const [addedUrlData, setAddedUrlData] = useState<SingleListData>();
  const [selectedTag, setSelectedTag] = useState<TagInputOption[]>([]);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [url, setUrl] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCategoryDuringAdd, setSelectedCategoryDuringAdd] =
    useState<SearchSelectOption | null>();
  const [addScreenshotBookmarkId, setAddScreenshotBookmarkId] =
    useState(undefined);
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

  // const toggleIsAddBookmarkModalButtonLoading = useLoadersStore(
  //   (state) => state.toggleIsAddBookmarkModalButtonLoading
  // );

  const toggleIsDeleteBookmarkLoading = useLoadersStore(
    (state) => state.toggleIsDeleteBookmarkLoading
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

  // const setShareCategoryId = useBookmarkCardViewState(
  //   (state) => state
  // );

  const fetchUserSession = async () => {
    const currentSession = await getCurrentUserSession();
    setSession(currentSession);

    if (!currentSession) {
      router.push(`/${LOGIN_URL}`);
    }
  };

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

  const category_slug = router?.asPath?.split('/')[1] || null;
  const category_id =
    getCategoryIdFromSlug(category_slug, allCategories?.data) || null;
  const {
    data: allBookmarksData,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    isLoading: isAllBookmarksDataLoading,
  } = useInfiniteQuery({
    queryKey: [BOOKMARKS_KEY, session?.user?.id, category_id],
    queryFn: fetchBookmakrsData,
    getNextPageParam: (lastPage, pages) => {
      return pages?.length * PAGINATION_LIMIT;
    },
  });

  const {} = useQuery([BOOKMARKS_KEY, TRASH_URL], () =>
    fetchBookmakrsData(TRASH_URL)
  );

  const { data: userTags } = useQuery([USER_TAGS_KEY, session?.user?.id], () =>
    fetchUserTags(session?.user?.id || '')
  );

  const { data: sharedCategoriesData } = useQuery(
    [SHARED_CATEGORIES_TABLE_NAME],
    () => fetchSharedCategoriesData()
  );

  const {} = useQuery([BOOKMARKS_VIEW, category_id], () =>
    fetchBookmarksViews({ category_id: category_id })
  );

  const { data: userProfileData } = useQuery(
    [USER_PROFILE, session?.user?.id],
    () => fetchUserProfiles({ userId: session?.user?.id as string })
  );

  // Mutations
  const deleteBookmarkOptismicMutation = useMutation(deleteData, {
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [BOOKMARKS_KEY, session?.user?.id, category_id],
        (old: { data: SingleListData[] } | undefined) => {
          if (typeof old === 'object') {
            return {
              ...old,
              pages: old?.pages?.map((item, index) => {
                return {
                  ...item,
                  data: item.data?.filter((item) => item?.id !== data?.id),
                };
              }),
            } as { data: SingleListData[] };
          }
        }
      );

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        [BOOKMARKS_KEY, session?.user?.id, category_id],
        context?.previousTodos
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);
    },
  });

  const moveBookmarkToTrashOptimisticMutation = useMutation(
    moveBookmarkToTrash,
    {
      onMutate: async (data) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries([
          BOOKMARKS_KEY,
          session?.user?.id,
          category_id,
        ]);

        // Snapshot the previous value
        const previousTodos = queryClient.getQueryData([
          BOOKMARKS_KEY,
          session?.user?.id,
          category_id,
        ]);

        // Optimistically update to the new value
        queryClient.setQueryData(
          [BOOKMARKS_KEY, session?.user?.id, category_id],
          (old: { data: SingleListData[] } | undefined) => {
            if (typeof old === 'object') {
              return {
                ...old,
                pages: old?.pages?.map((item, index) => {
                  return {
                    ...item,
                    data: item.data?.filter(
                      (item) => item?.id !== data?.data?.id
                    ),
                  };
                }),
              } as { data: SingleListData[] };
            }
          }
        );

        // Return a context object with the snapshotted value
        return { previousTodos };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (err, newTodo, context) => {
        queryClient.setQueryData(
          [BOOKMARKS_KEY, session?.user?.id, category_id],
          context?.previousTodos
        );
      },
      // Always refetch after error or success:
      onSettled: () => {
        queryClient.invalidateQueries([
          BOOKMARKS_KEY,
          session?.user?.id,
          category_id,
        ]);
      },
    }
  );

  const clearBookmarksInTrashMutation = useMutation(clearBookmarksInTrash, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
    },
  });

  const addBookmarkScreenshotMutation = useMutation(addBookmarkScreenshot, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
      setAddScreenshotBookmarkId(undefined);
    },
  });

  const addBookmarkMinDataOptimisticMutation = useMutation(addBookmarkMinData, {
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [BOOKMARKS_KEY, session?.user?.id, category_id],
        (old: { data: SingleListData[] } | undefined) => {
          if (typeof old === 'object') {
            const latestData = {
              ...old,
              pages: old?.pages?.map((item, index) => {
                if (index === 0) {
                  return {
                    ...item,
                    data: [
                      {
                        url: data?.url,
                        category_id: data?.category_id,
                        inserted_at: new Date(),
                      },
                      ...item?.data,
                    ],
                  };
                } else {
                  return item;
                }
              }),
            };
            return latestData;
          }
        }
      );

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        [BOOKMARKS_KEY, session?.user?.id, category_id],
        context?.previousTodos
      );
    },
    // Always refetch after error or success:
    onSettled: (res: unknown) => {
      queryClient.invalidateQueries([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);
      // queryClient.invalidateQueries([BOOKMARKS_KEY, session?.user?.id]);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const data = res?.data?.data[0];
      const ogImg = data?.ogImage;
      if (!ogImg || isEmpty(ogImg) || !ogImg?.includes('https://')) {
        addBookmarkScreenshotMutation.mutate({ url: data?.url, id: data?.id });
        setAddScreenshotBookmarkId(data?.id);
      }
    },
  });

  // tag mutation
  const addUserTagsMutation = useMutation(addUserTags, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([USER_TAGS_KEY, session?.user?.id]);
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

  const addCategoryOptimisticMutation = useMutation(addUserCategory, {
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData([
        CATEGORIES_KEY,
        session?.user?.id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [CATEGORIES_KEY, session?.user?.id],
        (old: { data: CategoriesData[] } | undefined) => {
          if (typeof old === 'object') {
            return {
              ...old,
              data: [
                ...old?.data,
                {
                  category_name: data?.name,
                  user_id: data?.user_id,
                  icon: 'file',
                },
              ],
            } as { data: CategoriesData[] };
          }
        }
      );

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        [CATEGORIES_KEY, session?.user?.id],
        context?.previousTodos
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
    },
  });

  const deleteCategoryOtimisticMutation = useMutation(deleteUserCategory, {
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData([
        CATEGORIES_KEY,
        session?.user?.id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [CATEGORIES_KEY, session?.user?.id],
        (old: { data: CategoriesData[] } | undefined) => {
          return {
            ...old,
            data: old?.data?.filter((item) => item?.id !== data?.category_id),
          } as { data: CategoriesData[] };
        }
      );

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        [CATEGORIES_KEY, session?.user?.id],
        context?.previousTodos
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
    },
  });

  const addCategoryToBookmarkMutation = useMutation(addCategoryToBookmark, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
      queryClient.invalidateQueries([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);
    },
  });

  const addCategoryToBookmarkOptimisticMutation = useMutation(
    addCategoryToBookmark,
    {
      onMutate: async (data) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);
        await queryClient.cancelQueries([
          BOOKMARKS_KEY,
          isNull(category_id) ? session?.user?.id : category_id,
        ]);

        const previousTodos = queryClient.getQueryData([
          BOOKMARKS_KEY,
          isNull(category_id) ? session?.user?.id : category_id,
        ]);

        // Optimistically update to the new value
        queryClient.setQueryData(
          [
            BOOKMARKS_KEY,
            isNull(category_id) ? session?.user?.id : category_id,
          ],
          (old: { data: CategoriesData[] } | undefined) => {
            return {
              ...old,
              data: isNull(category_id)
                ? old?.data
                : old?.data?.filter((item) => item?.id !== data?.bookmark_id), // do not filter when user is in all-bookmarks page
            } as { data: CategoriesData[] };
          }
        );

        // Return a context object with the snapshotted value
        return { previousTodos };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (err, newTodo, context) => {
        queryClient.setQueryData(
          [CATEGORIES_KEY, session?.user?.id],
          context?.previousTodos
        );
      },
      // Always refetch after error or success:
      onSettled: () => {
        queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
        queryClient.invalidateQueries([
          BOOKMARKS_KEY,
          session?.user?.id,
          category_id,
        ]);
      },
    }
  );

  const updateCategoryOptimisticMutation = useMutation(updateCategory, {
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData([
        CATEGORIES_KEY,
        session?.user?.id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [CATEGORIES_KEY, session?.user?.id],
        (old: { data: CategoriesData[] } | undefined) => {
          return {
            ...old,
            data: old?.data?.map((item) => {
              if (item?.id === data?.category_id) {
                return {
                  ...item,
                  category_views: data?.updateData?.category_views,
                  icon: data?.updateData?.icon
                    ? data?.updateData?.icon
                    : item?.icon,
                  is_public:
                    data?.updateData?.is_public !== undefined
                      ? data?.updateData?.is_public
                      : item?.is_public,
                };
              } else {
                return item;
              }
            }),
          } as { data: CategoriesData[] };
        }
      );

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        [CATEGORIES_KEY, session?.user?.id],
        context?.previousTodos
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
      queryClient.invalidateQueries([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);
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

  const updateSharedCategoriesOptimisticMutation = useMutation(
    updateSharedCategoriesUserAccess,
    {
      onMutate: async (data) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries([USER_PROFILE, session?.user?.id]);

        // Snapshot the previous value
        const previousTodos = queryClient.getQueryData([
          SHARED_CATEGORIES_TABLE_NAME,
        ]);

        // Optimistically update to the new value
        queryClient.setQueryData(
          [SHARED_CATEGORIES_TABLE_NAME],
          (old: { data: FetchSharedCategoriesData[] } | undefined) => {
            return {
              ...old,
              data: old?.data?.map((item) => {
                return {
                  ...item,
                  category_views: data?.updateData?.category_views,
                };
              }),
            } as { data: FetchSharedCategoriesData[] };
          }
        );

        // Return a context object with the snapshotted value
        return { previousTodos };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (err, newTodo, context) => {
        queryClient.setQueryData(
          [SHARED_CATEGORIES_TABLE_NAME],
          context?.previousTodos
        );
      },
      // Always refetch after error or success:
      onSettled: () => {
        queryClient.invalidateQueries([SHARED_CATEGORIES_TABLE_NAME]);
        queryClient.invalidateQueries([
          BOOKMARKS_KEY,
          session?.user?.id,
          category_id,
        ]);
      },
    }
  );

  // profiles table mutation
  const updateUserProfileOptimisticMutation = useMutation(updateUserProfile, {
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([USER_PROFILE, session?.user?.id]);

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData([
        CATEGORIES_KEY,
        session?.user?.id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [USER_PROFILE, session?.user?.id],
        (old: { data: ProfilesTableTypes[] } | undefined) => {
          return {
            ...old,
            data: old?.data?.map((item) => {
              return {
                ...item,
                bookmarks_view: data?.updateData?.bookmarks_view,
              };
            }),
          } as { data: ProfilesTableTypes[] };
        }
      );

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        [USER_PROFILE, session?.user?.id],
        context?.previousTodos
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
      queryClient.invalidateQueries([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);
    },
  });

  const addBookmarkLogic = async (url: string) => {
    setUrl(url);
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
    await mutationApiCall(
      addBookmarkMinDataOptimisticMutation.mutateAsync({
        url: url,
        category_id: category_id,
        update_access: updateAccessCondition,
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
            })
          );
        }
      } else {
        // only if user is updating sortby, then scroll to top
        if (updateValue === 'sortBy') {
          if (!isNull(infiniteScrollRef?.current)) {
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
  );

  const renderAllBookmarkCards = () => {
    return (
      <>
        <div className="pl-4">
          {session ? (
            <>
              <div className="mx-auto w-full lg:w-1/2 px-4 sm:px-0"></div>
              <div
                id="scrollableDiv"
                style={{ height: 'calc(100vh - 48.5px)', overflow: 'auto' }}
                ref={infiniteScrollRef}
              >
                <InfiniteScroll
                  dataLength={flattendPaginationBookmarkData?.length}
                  next={fetchNextPage}
                  hasMore={true}
                  // height={'calc(100vh - 48.5px)'}
                  loader={() => null}
                  scrollableTarget="scrollableDiv"
                >
                  <CardSection
                    paginationFetch={fetchNextPage}
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
                    // isLoading={
                    //   (isBookmarksLoading && !bookmarksData) ||
                    //   isAllBookmarksDataLoading
                    // }
                    isLoading={isAllBookmarksDataLoading}
                    // listData={
                    //   !isNull(category_id)
                    //     ? bookmarksData?.data || []
                    //     : allBookmarksData?.data || []
                    // }

                    listData={flattendPaginationBookmarkData || []}
                    onDeleteClick={async (item) => {
                      // toggleIsDeleteBookmarkLoading();
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
                          })
                        );
                      }

                      toggleIsDeleteBookmarkLoading();
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
                const currentBookark = flattendPaginationBookmarkData?.filter(
                  (item) => item?.id === addedUrlData?.id
                ) as unknown as SingleListData[];
                const delData = find(
                  currentBookark[0]?.addedTags,
                  (item) => item?.id === delValue || item?.name === delValue
                ) as unknown as BookmarksTagData;

                mutationApiCall(
                  removeTagFromBookmarkMutation.mutateAsync({
                    selectedData: delData,
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
                  })
                );
                // this is not optimistic as we need cat_id to add bookmark into that category
                // add the bookmark to the category after its created in add bookmark modal
                mutationApiCall(
                  addCategoryToBookmarkMutation.mutateAsync({
                    category_id: res?.data[0]?.id,
                    bookmark_id: addedUrlData?.id as number,
                    update_access: true, // in this case user is creating the category , so they will have access
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
        categoryId={category_id}
        isAddInputLoading={false}
        userId={session?.user?.id || ''}
        renderMainContent={renderAllBookmarkCards}
        userImg={session?.user?.user_metadata?.avatar_url}
        userName={session?.user?.user_metadata?.name || session?.user?.email}
        userEmail={session?.user?.user_metadata?.email}
        onNavAddClick={() => toggleShowAddBookmarkShortcutModal()}
        onSignOutClick={async () => {
          await signOut();
          setSession(undefined);
          router.push(`/${LOGIN_URL}`);
        }}
        onSigninClick={() => {
          signInWithOauth();
        }}
        onAddBookmark={async (url) => {
          await addBookmarkLogic(url);
        }}
        onAddNewCategory={(newCategoryName) => {
          mutationApiCall(
            addCategoryOptimisticMutation.mutateAsync({
              user_id: session?.user?.id as string,
              name: newCategoryName,
            })
          );

          const slug = slugify(newCategoryName, { lower: true });

          router.push(`/${slug}`);
        }}
        onCategoryOptionClick={async (value, current, id) => {
          switch (value) {
            case 'delete':
              mutationApiCall(
                deleteCategoryOtimisticMutation.mutateAsync({
                  category_id: id,
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
            setShareCategoryId(category_id);
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
        updateSharedCategoriesUserAccess={async (id, value) => {
          const res = await mutationApiCall(
            updateSharedCategoriesUserAccessMutation.mutateAsync({
              id: id,
              updateData: { edit_access: parseInt(value) ? true : false },
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
