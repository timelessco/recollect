import uniqid from "uniqid";

import type { CategoryIdUrlTypes } from "../../types/componentTypes";
import type { FileUploadMutationType } from "./clipboard-upload";

import { mutationApiCall } from "../../utils/apiHelpers";
import { isAcceptedMimeType } from "../../utils/constants";
import { parseUploadFileName, uploadFileLimit } from "../../utils/helpers";
import { errorToast } from "../../utils/toastMessages";

/**
 * Upload file logic
 * @param {FileList | undefined} acceptedFiles the files to upload
 * @param {FileUploadMutationType} fileUploadOptimisticMutation the mutation for the file upload
 * @param {CategoryIdUrlTypes} category_id the category_id of where to upload
 */
export const fileUpload = (
  acceptedFiles: File[] | FileList | undefined,
  fileUploadOptimisticMutation: FileUploadMutationType,
  category_id: CategoryIdUrlTypes,
) => {
  if (!acceptedFiles) {
    return;
  }

  for (let index = 0; index < acceptedFiles?.length; index += 1) {
    if (acceptedFiles[index] && isAcceptedMimeType(acceptedFiles[index]?.type)) {
      const uploadFileNamePath = uniqid.time(
        "",
        `-${parseUploadFileName(acceptedFiles[index]?.name)}`,
      );

      if (uploadFileLimit(acceptedFiles[index]?.size)) {
        errorToast("File size is larger than 10MB", "fileSizeError");
        continue;
      }

      // Call mutation immediately for all file types (fire-and-forget, concurrent uploads)
      // This triggers optimistic update immediately via onMutate
      // For videos, thumbnail generation will happen in onMutate if not provided
      /* oxlint-disable promise/prefer-await-to-then, promise/prefer-await-to-callbacks */
      void mutationApiCall(
        fileUploadOptimisticMutation.mutateAsync({
          category_id,
          file: acceptedFiles[index],
          thumbnailPath: null,
          uploadFileNamePath,
        }),
      ).catch((error: unknown) => {
        console.error(error);
      });
      /* oxlint-enable promise/prefer-await-to-then, promise/prefer-await-to-callbacks */
    } else {
      errorToast(`File type ${acceptedFiles[index]?.type} is not accepted`);
    }
  }
};
