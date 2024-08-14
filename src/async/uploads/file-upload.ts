import uniqid from "uniqid";

import { type CategoryIdUrlTypes } from "../../types/componentTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import { acceptedFileTypes } from "../../utils/constants";
import {
	generateVideoThumbnail,
	parseUploadFileName,
	uploadFileLimit,
} from "../../utils/helpers";
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

	for (let index = 0; index < acceptedFiles?.length; index++) {
		if (
			acceptedFiles[index] &&
			acceptedFileTypes?.includes(acceptedFiles[index]?.type)
		) {
			let thumbnailBase64 = null;
			if (acceptedFiles[index]?.type?.includes("video")) {
				// if file is a video this gets its first frame as a png base64
				thumbnailBase64 = (await generateVideoThumbnail(
					acceptedFiles[0],
				)) as string;
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
						thumbnailBase64,
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
