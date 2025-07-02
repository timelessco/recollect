import { decode } from "base64-arraybuffer";
import uniqid from "uniqid";

import { type CategoryIdUrlTypes } from "../../types/componentTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import { acceptedFileTypes, FILES_STORAGE_NAME } from "../../utils/constants";
import {
	generateVideoThumbnail,
	parseUploadFileName,
	uploadFileLimit,
} from "../../utils/helpers";
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
				// if file is a video, generate thumbnail and upload it to S3
				try {
					const thumbnailBase64 = (await generateVideoThumbnail(
						acceptedFiles[index],
					)) as string;

					if (thumbnailBase64) {
						const base64Data = thumbnailBase64?.split("base64,")[1];
						const uploadFileNamePath = uniqid.time(
							"",
							`-${parseUploadFileName(acceptedFiles[index]?.name)}`,
						);
						const thumbnailFileName = `thumbnail-${uploadFileNamePath}.png`;

						// Upload thumbnail directly to user's temp folder
						const { data } = await supabase.auth.getUser();
						const userId = data?.user?.id;

						if (userId) {
							// Upload thumbnail to S3
							const { error: thumbnailError } = await supabase.storage
								.from(FILES_STORAGE_NAME)
								.upload(
									`public/${userId}/${thumbnailFileName}`,
									decode(base64Data),
									{
										contentType: "image/png",
										upsert: true,
									},
								);

							if (!thumbnailError) {
								thumbnailPath = `public/${userId}/${thumbnailFileName}`;
							} else {
								console.error("Thumbnail upload error:", thumbnailError);
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
