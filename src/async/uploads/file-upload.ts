import uniqid from "uniqid";

import { type CategoryIdUrlTypes } from "../../types/componentTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import {
	acceptedFileTypes,
	R2_MAIN_BUCKET_NAME,
	STORAGE_FILES_PATH,
} from "../../utils/constants";
import {
	generateVideoThumbnail,
	parseUploadFileName,
	uploadFileLimit,
} from "../../utils/helpers";
import { r2Helpers } from "../../utils/r2Client";
import { createClient } from "../../utils/supabaseClient";
import { errorToast } from "../../utils/toastMessages";

import { type FileUploadMutationType } from "./clipboard-upload";

/**
 * Upload file logic
 *
 * @param {FileList | undefined} acceptedFiles the files to upload
 * @param {FileUploadMutationType} fileUploadOptimisticMutation the mutation for the file upload
 * @param {CategoryIdUrlTypes} category_id the category_id of where to upload
 */
export const fileUpload = async (
	acceptedFiles: FileList | undefined,
	fileUploadOptimisticMutation: FileUploadMutationType,
	category_id: CategoryIdUrlTypes,
) => {
	if (!acceptedFiles) {
		return;
	}

	const supabase = createClient();

	for (let index = 0; index < acceptedFiles?.length; index++) {
		if (
			acceptedFiles[index] &&
			acceptedFileTypes?.includes(acceptedFiles[index]?.type)
		) {
			let thumbnailPath: string | null = null;

			if (acceptedFiles[index]?.type?.includes("video")) {
				// if file is a video, generate thumbnail and upload it to R2
				try {
					const thumbnailBase64 = (await generateVideoThumbnail(
						acceptedFiles[index],
					)) as string;

					if (thumbnailBase64) {
						const uploadFileNamePath = uniqid.time(
							"",
							`-${parseUploadFileName(acceptedFiles[index]?.name)}`,
						);
						const thumbnailFileName = `thumbnail-${uploadFileNamePath}.png`;

						// Upload thumbnail directly to user's temp folder
						const { data } = await supabase.auth.getUser();
						const userId = data?.user?.id;

						if (userId) {
							// Generate presigned URL for thumbnail upload
							// we are doing this as we cannot upload directly to R2 from the client side
							const { data: uploadTokenData, error } =
								await r2Helpers.createSignedUploadUrl(
									R2_MAIN_BUCKET_NAME,
									`${STORAGE_FILES_PATH}/${userId}/${thumbnailFileName}`,
								);

							if (uploadTokenData?.signedUrl && !error) {
								try {
									// Extract base64 data (remove data:image/png;base64, prefix)
									const base64Data = thumbnailBase64.split(",")[1];

									if (!base64Data) {
										return;
									}

									// Convert base64 to binary using Buffer (modern approach)
									const buffer = Buffer.from(base64Data, "base64");

									// Upload thumbnail using presigned URL
									const uploadResponse = await fetch(
										uploadTokenData.signedUrl,
										{
											method: "PUT",
											headers: {
												"Content-Type": "image/jpg",
											},
											body: buffer,
										},
									);

									if (uploadResponse.ok) {
										thumbnailPath = `${STORAGE_FILES_PATH}/${userId}/${thumbnailFileName}`;
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

			if (uploadFileLimit(acceptedFiles[index]?.size)) {
				errorToast("File size is larger than 10mb", "fileSizeError");
			} else {
				const uploadFileNamePath = uniqid.time(
					"",
					`-${parseUploadFileName(acceptedFiles[index]?.name)}`,
				);
				mutationApiCall(
					fileUploadOptimisticMutation.mutateAsync({
						file: acceptedFiles[index],
						category_id,
						thumbnailPath,
						uploadFileNamePath,
					}),
					// eslint-disable-next-line promise/prefer-await-to-then
				).catch((error) => console.error(error));
			}
		} else {
			errorToast(`File type ${acceptedFiles[index]?.type} is not accepted`);
		}
	}
};
