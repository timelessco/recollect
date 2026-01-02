import * as Sentry from "@sentry/nextjs";
import { produce } from "immer";

import {
	type CreateAndAssignTagPayload,
	type CreateAndAssignTagResponse,
} from "@/app/api/tags/create-and-assign-tag/route";
import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { type PaginatedBookmarks, type UserTagsData } from "@/types/apiTypes";
import {
	BOOKMARKS_KEY,
	CREATE_AND_ASSIGN_TAG_API,
	USER_TAGS_KEY,
} from "@/utils/constants";
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
type CreateAndAssignTagMutationPayload = CreateAndAssignTagPayload & {
	_tempId?: number;
};

/**
 * Mutation hook for creating a new tag and assigning it to a bookmark in one atomic operation.
 * Uses PostgreSQL RPC function for transaction safety.
 */
export function useCreateAndAssignTagMutation() {
	const { queryClient, session, queryKey, searchQueryKey } =
		useBookmarkMutationContext();

	const createAndAssignTagMutation = useReactQueryOptimisticMutation<
		CreateAndAssignTagResponse,
		Error,
		CreateAndAssignTagMutationPayload,
		typeof queryKey,
		PaginatedBookmarks
	>({
		mutationFn: (payload) =>
			postApi<CreateAndAssignTagResponse>(
				`/api${CREATE_AND_ASSIGN_TAG_API}`,
				payload,
			),
		queryKey,
		secondaryQueryKey: searchQueryKey,

		updater: (currentData, variables) => {
			if (!currentData?.pages) {
				return currentData as PaginatedBookmarks;
			}

			const tempId = variables._tempId ?? -Date.now();

			return (
				updateBookmarkInPaginatedData(
					currentData,
					variables.bookmarkId,
					(bookmark) => {
						bookmark.addedTags = [
							...(bookmark.addedTags || []),
							{ id: tempId, name: variables.name } as UserTagsData,
						];
					},
				) ?? currentData
			);
		},

		// Additional optimistic updates for user tags cache
		additionalOptimisticUpdates: [
			// User tags cache
			{
				getQueryKey: () => [USER_TAGS_KEY, session?.user?.id],
				updater: (currentData, variables) => {
					const data = currentData as { data: UserTagsData[] } | undefined;

					if (!data?.data) {
						if (process.env.NODE_ENV === "development") {
							console.warn(`[Optimistic Update] User tags cache not found.`, {
								bookmarkId: variables.bookmarkId,
							});
						}

						Sentry.addBreadcrumb({
							category: "optimistic-update",
							message: "User tags cache not found",
							level: "warning",
							data: { bookmarkId: variables.bookmarkId },
						});
						return currentData;
					}

					// Use shared temp ID from variables to match BOOKMARKS_KEY cache
					const tempTag = {
						id: variables._tempId ?? -Date.now(),
						name: variables.name,
						user_id: session?.user?.id,
					} as unknown as UserTagsData;

					return produce(data, (draft) => {
						draft.data.push(tempTag);
					});
				},
			},
		],

		onSettled: (data, error, variables) => {
			if (error || !data) {
				return;
			}

			const tempId = variables._tempId ?? -Date.now();
			const realTag = data.tag;

			// Update primary cache - swap temp tag with real tag
			queryClient.setQueryData<PaginatedBookmarks>(queryKey, (current) =>
				updateBookmarkInPaginatedData(
					current,
					variables.bookmarkId,
					(bookmark) => {
						swapTempTagId(bookmark, tempId, realTag);
					},
				),
			);

			// Update search cache if active
			if (searchQueryKey) {
				queryClient.setQueryData<PaginatedBookmarks>(
					searchQueryKey,
					(current) =>
						updateBookmarkInPaginatedData(
							current,
							variables.bookmarkId,
							(bookmark) => {
								swapTempTagId(bookmark, tempId, realTag);
							},
						),
				);
			}

			// Update USER_TAGS_KEY cache - swap temp tag with real tag
			queryClient.setQueryData<{ data: UserTagsData[] }>(
				[USER_TAGS_KEY, session?.user?.id],
				(current) =>
					swapTempTagInUserTagsCache(current, tempId, {
						id: realTag.id,
						name: realTag.name,
						user_id: realTag.user_id ?? undefined,
						created_at: realTag.created_at ?? undefined,
					}),
			);

			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: [USER_TAGS_KEY, session?.user?.id],
			});
		},

		showSuccessToast: true,
		successMessage: "Tag created",
	});

	return { createAndAssignTagMutation };
}
