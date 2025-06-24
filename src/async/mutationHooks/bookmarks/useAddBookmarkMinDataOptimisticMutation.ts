import { useMutation, useQueryClient } from "@tanstack/react-query";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarksPaginatedDataTypes,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	DOCUMENTS_URL,
	IMAGES_URL,
	menuListItemName,
	TWEETS_URL,
	URL_IMAGE_CHECK_PATTERN,
	VIDEOS_URL,
} from "../../../utils/constants";
import { successToast } from "../../../utils/toastMessages";
import { addBookmarkMinData } from "../../supabaseCrudHelpers";

import useAddBookmarkScreenshotMutation from "./useAddBookmarkScreenshotMutation";

// adds bookmark min data
export default function useAddBookmarkMinDataOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);

	const queryClient = useQueryClient();
	const setAddScreenshotBookmarkId = useMiscellaneousStore(
		(state) => state.setAddScreenshotBookmarkId,
	);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();
	const { sortBy } = useGetSortBy();

	const addBookmarkMinDataOptimisticMutation = useMutation(addBookmarkMinData, {
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				sortBy,
			]);

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				sortBy,
			]);

			// Optimistically update to the new value
			queryClient.setQueryData<BookmarksPaginatedDataTypes>(
				[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
				(old) => {
					if (typeof old === "object") {
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
											...item.data,
										],
									};
								}

								return item;
							}),
						};
						return latestData as BookmarksPaginatedDataTypes;
					}

					return undefined;
				},
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: BookmarksPaginatedDataTypes }) => {
			queryClient.setQueryData(
				[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
				context?.previousData,
			);
		},
		// Always refetch after error or success:
		onSettled: (apiResponse: unknown) => {
			const response = apiResponse as { data: { data: SingleListData[] } };
			void queryClient.invalidateQueries([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				sortBy,
			]);
			void queryClient.invalidateQueries([
				BOOKMARKS_COUNT_KEY,
				session?.user?.id,
			]);

			if (!response?.data?.data) {
				// something went wrong when adding min data so we return
				return;
			}

			const data = response?.data?.data[0];
			const ogImg = data?.ogImage;
			const url = data?.url;

			// this is to check if url is not a website like test.pdf
			// if this is the case then we do not call the screenshot api
			const isUrlOfMimeType = url?.match(URL_IMAGE_CHECK_PATTERN);

			if (isNull(isUrlOfMimeType)) {
				addBookmarkScreenshotMutation.mutate({
					url: data?.url,
					id: data?.id,
				});
				setAddScreenshotBookmarkId(data?.id);
			}
		},
		onSuccess: (apiResponse) => {
			const apiResponseTyped = apiResponse as unknown as { status: number };
			if (
				(CATEGORY_ID === VIDEOS_URL ||
					CATEGORY_ID === DOCUMENTS_URL ||
					CATEGORY_ID === TWEETS_URL ||
					CATEGORY_ID === IMAGES_URL) &&
				apiResponseTyped?.status === 200
			) {
				// if user is adding a link in any of the Types pages (Videos, Images etc ...) then we get this toast message
				successToast(
					`This bookmark will be added to ${menuListItemName?.links}`,
				);
			}
		},
	});

	return { addBookmarkMinDataOptimisticMutation };
}
