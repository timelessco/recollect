import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useLoadersStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarksPaginatedDataTypes,
	type CategoriesData,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	DOCUMENTS_URL,
	IMAGES_URL,
	menuListItemName,
	PDF_MIME_TYPE,
	TWEETS_URL,
	URL_PDF_CHECK_PATTERN,
	VIDEOS_URL,
} from "../../../utils/constants";
import { handlePdfThumbnailAndUpload } from "../../../utils/file-upload";
import { checkIfUrlAnImage } from "../../../utils/helpers";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { addBookmarkMinData, getMediaType } from "../../supabaseCrudHelpers";

import useAddBookmarkScreenshotMutation from "./useAddBookmarkScreenshotMutation";

// adds bookmark min data
export default function useAddBookmarkMinDataOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);

	const queryClient = useQueryClient();

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	// We'll initialize the mutation with a default value and update it when we have the actual ID
	const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();
	const { sortBy } = useGetSortBy();
	const { addLoadingBookmarkId, removeLoadingBookmarkId } = useLoadersStore();

	const addBookmarkMinDataOptimisticMutation = useMutation({
		mutationFn: addBookmarkMinData,
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
			});

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				sortBy,
			]);

			// Fetch category from cache to build addedCategories
			const allCategories =
				(
					queryClient.getQueryData([CATEGORIES_KEY, session?.user?.id]) as
						| { data: CategoriesData[] }
						| undefined
				)?.data ?? [];

			const categoryEntry = allCategories.find(
				(cat) => cat.id === data?.category_id,
			);

			// Build addedCategories array (empty if category not in cache)
			const addedCategories = categoryEntry
				? [
						{
							id: categoryEntry.id,
							category_name: categoryEntry.category_name,
							category_slug: categoryEntry.category_slug,
							icon: categoryEntry.icon,
							icon_color: categoryEntry.icon_color,
						},
					]
				: [];

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
												addedCategories,
												inserted_at: new Date(),
												addedTags: [],
												trash: null,
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
		onSettled: async (apiResponse: unknown) => {
			const response = apiResponse as { data: { data: SingleListData[] } };
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});

			if (!response?.data?.data) {
				// something went wrong when adding min data so we return
				return;
			}

			const data = response?.data?.data[0];
			const url = data?.url;

			// this is to check if url is not a website like test.pdf
			// if this is the case then we do not call the screenshot api
			const isUrlOfMimeType = await checkIfUrlAnImage(url);
			// **************
			// here we are checking if the url is an image, we don't check for mime type,
			// if we check if is an mime type then screenshot api cannot be called
			// ex: if it is an .mp4(url) the mime type will be video/mp4 so screenshot api cannot be called, we will not have preview image
			//  **************

			// only take screenshot if url is not an image like https://test.com/test.jpg
			// then in the screenshot api we call the add remaining bookmark data api so that the meta_data is got for the screenshot image
			if (!isUrlOfMimeType) {
				const mediaType = await getMediaType(url);
				// Audio URLs already have ogImage fallback set in add-bookmark-min-data; skip screenshot
				if (mediaType?.includes("audio")) {
					return;
				}

				if (mediaType === PDF_MIME_TYPE || URL_PDF_CHECK_PATTERN.test(url)) {
					try {
						// adding id into loading state for the case of pdf
						addLoadingBookmarkId(data?.id);
						successToast("Generating thumbnail");
						await handlePdfThumbnailAndUpload({
							fileUrl: data?.url,
							fileId: data?.id,
							sessionUserId: session?.user?.id,
						});
					} catch (error) {
						console.warn("First attempt failed, retrying...", error);
						try {
							errorToast("retry thumbnail generation");
							await handlePdfThumbnailAndUpload({
								fileUrl: data?.url,
								fileId: data?.id,
								sessionUserId: session?.user?.id,
							});
						} catch (retryError) {
							console.error(
								"PDF thumbnail upload failed after retry:",
								retryError,
							);
							errorToast("thumbnail generation failed");
						}
					} finally {
						// invalidating and removing id from loading state for the case of pdf
						void queryClient.invalidateQueries({
							queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
						});
						removeLoadingBookmarkId(data?.id);
					}

					return;
				}

				if (data?.id) {
					addLoadingBookmarkId(data?.id);
				}

				// update to zustand here
				addBookmarkScreenshotMutation.mutate({
					url: data?.url,
					id: data?.id,
				});
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
