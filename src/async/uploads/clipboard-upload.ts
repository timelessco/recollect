import { isEmpty } from "lodash";

import type {
  AddBookmarkMinDataPayloadTypes,
  PaginatedBookmarks,
  UploadFileApiPayload,
} from "../../types/apiTypes";
import type { CategoryIdUrlTypes } from "../../types/componentTypes";
import type { UseMutationResult } from "@tanstack/react-query";

import { URL_PATTERN } from "../../utils/constants";
import { fileUpload } from "./file-upload";

type AddMinDataMutationType = UseMutationResult<
  unknown,
  Error,
  AddBookmarkMinDataPayloadTypes,
  { previousData: PaginatedBookmarks | undefined; tempId: number }
>;

export type FileUploadMutationType = UseMutationResult<
  unknown,
  Error,
  UploadFileApiPayload,
  { preGeneratedUrl: string; previousData: unknown; tempId: number }
>;

/**
 * This has the logic to upload url or file during copy and paste
 * @param {string | undefined} text the url to be uploaded
 * @param {FileList | undefined} files the files to be uploaded
 * @param {CategoryIdUrlTypes} category_id the category_id of where to be uploaded
 * @param {AddMinDataMutationType} addBookmarkMinDataOptimisticMutation the mutation for bookmark uploads
 * @param {FileUploadMutationType} fileUploadOptimisticMutation the mutation for file uploads
 */
export const clipboardUpload = async (
  text: string | undefined,
  files: FileList | undefined,
  category_id: CategoryIdUrlTypes,
  addBookmarkMinDataOptimisticMutation: AddMinDataMutationType,
  fileUploadOptimisticMutation: FileUploadMutationType,
) => {
  if (files) {
    fileUpload(files, fileUploadOptimisticMutation, category_id);
  }

  if (text) {
    // check if the text is a bookmark url
    const isUrl = text?.match(URL_PATTERN);

    if (isUrl && !isEmpty(isUrl)) {
      await addBookmarkMinDataOptimisticMutation.mutateAsync({
        category_id,
        update_access: true,
        url: text.trim(),
      });
    }
  }
};
