import { useMutation, useQueryClient } from "@tanstack/react-query";
import isNull from "lodash/isNull";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useSupabaseSession } from "../../../store/componentStore";
import {
	type BookmarksPaginatedDataTypes,
	type UploadFileApiPayload,
} from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	bookmarkType,
	documentFileTypes,
	DOCUMENTS_URL,
	imageFileTypes,
	IMAGES_URL,
	LINKS_URL,
	PDF_MIME_TYPE,
	R2_MAIN_BUCKET_NAME,
	STORAGE_FILES_PATH,
	TWEETS_URL,
	tweetType,
	videoFileTypes,
	VIDEOS_URL,
} from "../../../utils/constants";
import { handlePdfThumbnailAndUpload } from "../../../utils/file-upload";
import {
	fileTypeIdentifier,
	generateVideoThumbnail,
	parseUploadFileName,
} from "../../../utils/helpers";
import { r2Helpers } from "../../../utils/r2Client";
import { createClient } from "../../../utils/supabaseClient";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { uploadFile } from "../../supabaseCrudHelpers";

// get bookmark screenshot
export default function useFileUploadOptimisticMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const { sortBy } = useGetSortBy();

	const fileUploadOptimisticMutation = useMutation({
		mutationFn: async (data: UploadFileApiPayload) => {
			// For videos, generate thumbnail if not provided
			let thumbnailPath = data.thumbnailPath;
			// please verify if this file type is available for mobile devices
			const isVideo = data?.file?.type?.includes("video");

			if (isVideo && !thumbnailPath) {
				try {
					const thumbnailBase64 = (await generateVideoThumbnail(
						data?.file,
					)) as string;

					if (thumbnailBase64) {
						const uploadFileNamePath = data?.uploadFileNamePath;
						const thumbnailFileName = `thumbnail-${uploadFileNamePath}.jpg`;
						const supabase = createClient();
						const { data: userData } = await supabase.auth.getUser();
						const userId = userData?.user?.id;

						if (userId) {
							const { data: uploadTokenData, error } =
								await r2Helpers.createSignedUploadUrl(
									R2_MAIN_BUCKET_NAME,
									`${STORAGE_FILES_PATH}/${userId}/${thumbnailFileName}`,
								);

							if (uploadTokenData?.signedUrl && !error) {
								try {
									const base64Data = thumbnailBase64?.split(",")?.[1];
									if (base64Data) {
										const buffer = Buffer.from(base64Data, "base64");
										const uploadResponse = await fetch(
											uploadTokenData.signedUrl,
											{
												method: "PUT",
												headers: {
													"Content-Type": "image/jpg",
												},
												body: buffer.buffer as BodyInit,
											},
										);

										if (uploadResponse.ok) {
											thumbnailPath = `${STORAGE_FILES_PATH}/${userId}/${thumbnailFileName}`;
										}
									}
								} catch (uploadError) {
									console.error("Thumbnail upload error:", uploadError);
								}
							}
						}
					}
				} catch (error) {
					console.error("Error generating video thumbnail:", error);
				}
			}

			// Call the original uploadFile with the updated thumbnail path
			return await uploadFile({
				...data,
				thumbnailPath,
			});
		},
		onMutate: async (data: UploadFileApiPayload) => {
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

			const fileName = parseUploadFileName(data?.file?.name);

			// Optimistically update to the new value immediately
			// This shows the bookmark right away, even for videos
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
												type: data?.file?.type,
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
					R2_MAIN_BUCKET_NAME,
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
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});
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

				if (data?.file?.type === PDF_MIME_TYPE) {
					try {
						successToast(`generating  thumbnail`);
						await handlePdfThumbnailAndUpload({
							fileUrl: `${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL}/${STORAGE_FILES_PATH}/${session?.user?.id}/${data?.uploadFileNamePath}`,
							fileId: apiResponseTyped?.data[0].id,
							sessionUserId: session?.user?.id,
						});
					} catch {
						errorToast("Failed to generate thumbnail");
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
