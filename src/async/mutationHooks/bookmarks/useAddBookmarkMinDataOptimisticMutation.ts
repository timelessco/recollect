import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type AddBookmarkMinDataPayloadTypes,
	type BookmarksPaginatedDataTypes,
} from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	DOCUMENTS_URL,
	IMAGES_URL,
	menuListItemName,
	TWEETS_URL,
	VIDEOS_URL,
} from "../../../utils/constants";
import { checkIfUrlAnImage } from "../../../utils/helpers";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { addBookmarkMinData } from "../../supabaseCrudHelpers";

import useAddBookmarkScreenshotMutation from "./useAddBookmarkScreenshotMutation";

type AddBookmarkMinDataResponse = {
	data: {
		data: Array<{
			id: number;
			url: string;
		}>;
	};
};

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

	const addBookmarkMinDataOptimisticMutation = useMutation(
		async (data: AddBookmarkMinDataPayloadTypes) => {
			const result = (await addBookmarkMinData(
				data,
			)) as AddBookmarkMinDataResponse;

			// If successful and not an image, trigger screenshot
			if (result?.data?.data?.[0]) {
				const bookmarkData = result.data.data[0];
				const isUrlOfMimeType = await checkIfUrlAnImage(bookmarkData.url);

				// Invalidate the query to ensure fresh data is fetched
				await queryClient.invalidateQueries([
					BOOKMARKS_KEY,
					session?.user?.id,
					CATEGORY_ID,
					sortBy,
				]);

				if (!isUrlOfMimeType) {
					errorToast("screenshot initiated!!!!!!!!");
					await addBookmarkScreenshotMutation.mutateAsync({
						url: bookmarkData.url,
						id: bookmarkData.id,
					});
					setAddScreenshotBookmarkId(bookmarkData.id);
				}
			}

			return result;
		},
		{
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
			onSettled: async (
				_apiResponse: AddBookmarkMinDataResponse | undefined,
			) => {
				// Invalidate queries to refresh the data
				await Promise.all([
					queryClient.invalidateQueries([
						BOOKMARKS_KEY,
						session?.user?.id,
						CATEGORY_ID,
						sortBy,
					]),
					queryClient.invalidateQueries([
						BOOKMARKS_COUNT_KEY,
						session?.user?.id,
					]),
				]);
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
		},
	);

	return { addBookmarkMinDataOptimisticMutation };
}
