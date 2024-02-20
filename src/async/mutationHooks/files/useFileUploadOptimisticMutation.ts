import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { type BookmarksPaginatedDataTypes } from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	bookmarkType,
	documentFileTypes,
	DOCUMENTS_URL,
	FILES_STORAGE_NAME,
	imageFileTypes,
	IMAGES_URL,
	LINKS_URL,
	videoFileTypes,
	VIDEOS_URL,
} from "../../../utils/constants";
import { fileTypeIdentifier } from "../../../utils/helpers";
import { successToast } from "../../../utils/toastMessages";
import { uploadFile } from "../../supabaseCrudHelpers";

// get bookmark screenshot
export default function useFileUploadOptimisticMutation() {
	const queryClient = useQueryClient();
	const session = useSession();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const supabase = useSupabaseClient();

	// const fileUploadOptimisticMutation = useMutation(uploadFile, {
	// 	onSuccess: () => {
	// 		// Invalidate and refetch
	// 		void queryClient.invalidateQueries([BOOKMARKS_KEY]);
	// 	},
	// });

	const { sortBy } = useGetSortBy();

	const fileUploadOptimisticMutation = useMutation(uploadFile, {
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
												title: data?.file?.name,
												url: "https://supabase.com/",
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

			/* Vercel has a limit where we cannot send files that are more than 4.5mb to 
				server less functions https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions.
				Because of this constraint we are uploading the resource in the client side itself
			*/

			// generate signed url to make the upload more secure as its taking place in client side
			const { data: uploadTokenData } = await supabase.storage
				.from(FILES_STORAGE_NAME)
				.createSignedUploadUrl(
					`public/${session?.user?.id}/${data?.file?.name}`,
				);

			if (uploadTokenData?.token) {
				// the token will not be there if the resource is alredy present in the bucket
				// if the resource is not there then we upload via the token
				// we get this uploaded file in the api with the help of file name, thus we are not sending the uploaded response to the api from the client side
				await supabase.storage
					.from(FILES_STORAGE_NAME)
					.uploadToSignedUrl(
						`public/${session?.user?.id}/${data?.file?.name}`,
						uploadTokenData?.token,
						data?.file,
					);
			}

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
		onSettled: () => {
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
		},
		onSuccess: (apiResponse, data) => {
			const uploadedDataType = data?.file?.type;

			const apiResponseTyped = apiResponse as unknown as { success: boolean };

			if (apiResponseTyped?.success === true) {
				const fileTypeName = fileTypeIdentifier(uploadedDataType);

				/* If the user uploads to a type page (links, videos) and the uploaded type is not of the page eg: user 
					is uploading images in videos page then this logic fires and it tells where the item has been uploaded. 
					Eg: If user uploads images in documents page then the user will get a toast message 
				telling "Added to documents page"  */

				if (
					CATEGORY_ID === IMAGES_URL &&
					!imageFileTypes?.includes(uploadedDataType)
				) {
					successToast(`Added to ${fileTypeName}`);
				}

				if (
					CATEGORY_ID === VIDEOS_URL &&
					!videoFileTypes?.includes(uploadedDataType)
				) {
					successToast(`Added to ${fileTypeName}`);
				}

				if (
					CATEGORY_ID === DOCUMENTS_URL &&
					!documentFileTypes?.includes(uploadedDataType)
				) {
					successToast(`Added to ${fileTypeName}`);
				}

				if (CATEGORY_ID === LINKS_URL && uploadedDataType !== bookmarkType) {
					successToast(`Added to ${fileTypeName}`);
				}
			}
		},
	});

	return { fileUploadOptimisticMutation };
}
