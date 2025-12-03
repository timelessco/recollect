import uniqid from "uniqid";

import { type CategoryIdUrlTypes } from "../../types/componentTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import { acceptedFileTypes } from "../../utils/constants";
import { parseUploadFileName, uploadFileLimit } from "../../utils/helpers";
import { errorToast } from "../../utils/toastMessages";

import { type FileUploadMutationType } from "./clipboard-upload";

/**
 * Upload file logic
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
			const isVideo = acceptedFiles[index]?.type?.includes("video");
			const uploadFileNamePath = uniqid.time(
				"",
				`-${parseUploadFileName(acceptedFiles[index]?.name)}`,
			);

			if (uploadFileLimit(acceptedFiles[index]?.size)) {
				errorToast("File size is larger than 10mb", "fileSizeError");
				continue;
			}

			// Call mutation immediately for all file types
			// This triggers optimistic update immediately via onMutate
			// For videos, thumbnail generation will happen in onMutate if not provided
			mutationApiCall(
				fileUploadOptimisticMutation.mutateAsync({
					file: acceptedFiles[index],
					category_id,
					thumbnailPath: isVideo ? null : null,
					uploadFileNamePath,
				}),
				// eslint-disable-next-line promise/prefer-await-to-then
			).catch((error) => console.error(error));
		} else {
			errorToast(`File type ${acceptedFiles[index]?.type} is not accepted`);
		}
	}
};
