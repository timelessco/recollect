import { produce } from "immer";

import type {
  CreateAndAssignTagInput,
  CreateAndAssignTagOutput,
} from "@/app/api/v2/tags/create-and-assign-tag/schema";
import type { PaginatedBookmarks, TempTag, UserTagsData } from "@/types/apiTypes";

import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import { BOOKMARKS_KEY, USER_TAGS_KEY, V2_CREATE_AND_ASSIGN_TAG_API } from "@/utils/constants";
import {
  swapTempTagId,
  swapTempTagInUserTagsCache,
  updateBookmarkInPaginatedData,
} from "@/utils/query-cache-helpers";

/**
 * Extended payload type with optional temp ID for optimistic updates.
 * When provided, both BOOKMARKS_KEY and USER_TAGS_KEY caches use the same
 * temp ID, preventing UI flash from ID mismatches during lookup.
 */
type CreateAndAssignTagMutationPayload = CreateAndAssignTagInput & {
  _tempId?: number;
};

/**
 * Internal payload type with guaranteed temp ID.
 * The wrapper ensures _tempId is always set before mutation lifecycle runs.
 */
type InternalPayload = CreateAndAssignTagInput & {
  _tempId: number;
};

/**
 * Mutation hook for creating a new tag and assigning it to a bookmark in one atomic operation.
 * Uses PostgreSQL RPC function for transaction safety.
 */
export function useCreateAndAssignTagOptimisticMutation() {
  const { queryClient, queryKey, searchQueryKey, session } = useBookmarkMutationContext();

  const baseMutation = useReactQueryOptimisticMutation<
    CreateAndAssignTagOutput,
    Error,
    InternalPayload,
    typeof queryKey,
    PaginatedBookmarks
  >({
    // Additional optimistic updates for user tags cache
    additionalOptimisticUpdates: [
      // User tags cache
      {
        getQueryKey: () => [USER_TAGS_KEY, session?.user?.id],
        updater: (currentData, variables) => {
          const data = currentData as UserTagsData[] | undefined;

          if (!data) {
            logCacheMiss("Optimistic Update", "User tags cache not found", {
              bookmarkId: variables.bookmarkId,
            });
            return currentData;
          }

          // Use shared temp ID from variables to match BOOKMARKS_KEY cache
          // Single localized cast: USER_TAGS_KEY cache expects full UserTagsData,
          // but temp tags only have id/name/user_id until server responds
          const tempTag: TempTag & { user_id?: string } = {
            id: variables._tempId,
            name: variables.name,
            user_id: session?.user?.id,
          };

          return produce(data, (draft) => {
            draft.push(tempTag as UserTagsData);
          });
        },
      },
    ],
    mutationFn: (payload) => {
      const { _tempId, ...body } = payload;
      return api
        .post(V2_CREATE_AND_ASSIGN_TAG_API, { json: body })
        .json<CreateAndAssignTagOutput>();
    },
    onSettled: (data, error, variables) => {
      if (error || !data) {
        return;
      }

      const { _tempId: tempId } = variables;
      const realTag = data.tag;

      // Update primary cache - swap temp tag with real tag
      queryClient.setQueryData<PaginatedBookmarks>(queryKey, (current) =>
        updateBookmarkInPaginatedData(current, variables.bookmarkId, (bookmark) => {
          swapTempTagId(bookmark, tempId, realTag);
        }),
      );

      // Update search cache - swap temp tag with real tag
      if (searchQueryKey) {
        queryClient.setQueryData<PaginatedBookmarks>(searchQueryKey, (current) =>
          updateBookmarkInPaginatedData(current, variables.bookmarkId, (bookmark) => {
            swapTempTagId(bookmark, tempId, realTag);
          }),
        );
      }

      // Update USER_TAGS_KEY cache - swap temp tag with real tag
      queryClient.setQueryData<UserTagsData[]>([USER_TAGS_KEY, session?.user?.id], (current) =>
        swapTempTagInUserTagsCache(current, tempId, {
          created_at: realTag.created_at ?? undefined,
          id: realTag.id,
          name: realTag.name,
          user_id: realTag.user_id ?? undefined,
        }),
      );

      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [USER_TAGS_KEY, session?.user?.id],
      });
    },

    queryKey,

    secondaryQueryKey: searchQueryKey,

    showSuccessToast: true,

    successMessage: "Tag created",
    updater: (currentData, variables) => {
      if (!currentData?.pages) {
        return currentData!;
      }

      return (
        updateBookmarkInPaginatedData(currentData, variables.bookmarkId, (bookmark) => {
          const tempTag: TempTag = {
            id: variables._tempId,
            name: variables.name,
          };
          bookmark.addedTags = [...(bookmark.addedTags || []), tempTag];
        }) ?? currentData
      );
    },
  });

  // Wrap mutation to ensure _tempId is generated once before any lifecycle hook runs
  const createAndAssignTagOptimisticMutation = {
    ...baseMutation,
    mutate: (
      variables: CreateAndAssignTagMutationPayload,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => {
      const enrichedVariables: InternalPayload = {
        ...variables,
        _tempId: variables._tempId ?? -Date.now(),
      };
      baseMutation.mutate(enrichedVariables, options);
    },
    mutateAsync: (
      variables: CreateAndAssignTagMutationPayload,
      options?: Parameters<typeof baseMutation.mutateAsync>[1],
    ) => {
      const enrichedVariables: InternalPayload = {
        ...variables,
        _tempId: variables._tempId ?? -Date.now(),
      };
      return baseMutation.mutateAsync(enrichedVariables, options);
    },
  };

  return { createAndAssignTagOptimisticMutation };
}
