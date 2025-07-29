import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import isNull from "lodash/isNull";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useSupabaseSession } from "../../../store/componentStore";
import { type BookmarksPaginatedDataTypes } from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	bookmarkType,
	documentFileTypes,
	DOCUMENTS_URL,
	getBaseUrl,
	imageFileTypes,
	IMAGES_URL,
	LINKS_URL,
	NEXT_API_URL,
	STORAGE_FILES_PATH,
	TWEETS_URL,
	tweetType,
	UPLOAD_FILE_REMAINING_DATA_API,
	videoFileTypes,
	VIDEOS_URL,
} from "../../../utils/constants";
import {
	fileTypeIdentifier,
	parseUploadFileName,
} from "../../../utils/helpers";
import { r2Helpers } from "../../../utils/r2Client";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { uploadFile } from "../../supabaseCrudHelpers";

import { generatePdfThumbnail } from "./utils/pdfThumbail";

// get bookmark screenshot
export default function useFileUploadOptimisticMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

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

			const fileName = parseUploadFileName(data?.file?.name);

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
												title: fileName,
												url: "",
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

			const uploadFileNamePath = data?.uploadFileNamePath;

			// Generate presigned URL for secure client-side upload
			const { data: uploadTokenData, error } =
				await r2Helpers.createSignedUploadUrl(
					"recollect",
					`${STORAGE_FILES_PATH}/${session?.user?.id}/${uploadFileNamePath}`,
				);

			// Upload file using presigned URL
			const errorCondition = isNull(error);

			if (uploadTokenData?.signedUrl && errorCondition) {
				try {
					const uploadResponse = await fetch(uploadTokenData.signedUrl, {
						method: "PUT",
						body: data?.file,
						headers: {
							"Content-Type": data?.file?.type || "application/octet-stream",
						},
					});

					if (!uploadResponse.ok) {
						const errorMessage = `Upload failed with status: ${uploadResponse.status}`;
						errorToast(errorMessage);
					}
				} catch (uploadError) {
					console.error("Upload error:", uploadError);
					errorToast("Upload failed");
				}
			}

			if (!errorCondition) {
				errorToast("Failed to create upload URL");
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
		onSuccess: async (apiResponse, data) => {
			const uploadedDataType = data?.file?.type;

			const apiResponseTyped = apiResponse as unknown as {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				data: any;
				success: boolean;
			};

			if (apiResponseTyped?.success === true) {
				const fileTypeName = fileTypeIdentifier(uploadedDataType);

				/* If the user uploads to a type page (links, videos) and the uploaded type is not of the page eg: user 
					is uploading images in videos page then this logic fires and it tells where the item has been uploaded. 
					Eg: If user uploads images in documents page then the user will get a toast message 
				telling "Added to documents page"  */

				if (data?.file?.type === "application/pdf") {
					const thumbnailBlob = await generatePdfThumbnail(data.file);

					if (thumbnailBlob) {
						const thumbnailFileName = `thumb-${data?.uploadFileNamePath.replace(
							".pdf",
							".jpg",
						)}`;

						const { data: thumbUploadUrl, error: thumbError } =
							await r2Helpers.createSignedUploadUrl(
								"recollect",
								`${STORAGE_FILES_PATH}/${session?.user?.id}/${thumbnailFileName}`,
							);

						if (thumbUploadUrl?.signedUrl && !thumbError) {
							try {
								const uploadResponse = await fetch(thumbUploadUrl.signedUrl, {
									method: "PUT",
									body: thumbnailBlob,
									headers: {
										"Content-Type": "image/png",
									},
								});

								if (!uploadResponse.ok) {
									console.error("Thumbnail upload failed");
								} else {
									const publicUrl = `https://media.recollect.so/${STORAGE_FILES_PATH}/${session?.user?.id}/${thumbnailFileName}`;

									await axios.post(
										`${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_REMAINING_DATA_API}`,
										{
											id: apiResponseTyped?.data[0].id,
											publicUrl,
										},
									);
								}
							} catch (error_) {
								console.error("Thumbnail upload error:", error_);
							}
						}
					}
				}

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

				if (CATEGORY_ID === TWEETS_URL && uploadedDataType !== tweetType) {
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
