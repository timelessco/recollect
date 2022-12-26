import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMiscellaneousStore } from '../../../store/componentStore';
import { BOOKMARKS_COUNT_KEY, BOOKMARKS_KEY } from '../../../utils/constants';
import { addBookmarkMinData } from '../../supabaseCrudHelpers';
import { useSession } from '@supabase/auth-helpers-react';
import useGetCurrentCategoryId from '../../../hooks/useGetCurrentCategoryId';
import { BookmarksPaginatedDataTypes } from '../../../types/apiTypes';
import useAddBookmarkScreenshotMutation from './useAddBookmarkScreenshotMutation';
import { isEmpty } from 'lodash';

// adds bookmark min data
export default function useAddBookmarkMinDataOptimisticMutation() {
  const session = useSession();

  const queryClient = useQueryClient();
  const setAddScreenshotBookmarkId = useMiscellaneousStore(
    (state) => state.setAddScreenshotBookmarkId
  );

  const { category_id } = useGetCurrentCategoryId();

  const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();

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
      queryClient.setQueryData<BookmarksPaginatedDataTypes>(
        [BOOKMARKS_KEY, session?.user?.id, category_id],
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        (old) => {
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
      queryClient.invalidateQueries([BOOKMARKS_COUNT_KEY, session?.user?.id]);
      // queryClient.invalidateQueries([BOOKMARKS_KEY, session?.user?.id]);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const data = res?.data?.data[0];
      const ogImg = data?.ogImage;
      if (!ogImg || isEmpty(ogImg) || !ogImg?.includes('https://')) {
        addBookmarkScreenshotMutation.mutate({
          url: data?.url,
          id: data?.id,
          session,
        });
        setAddScreenshotBookmarkId(data?.id);
      }
    },
  });

  return { addBookmarkMinDataOptimisticMutation };
}
