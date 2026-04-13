import { useCallback } from "react";

import type { FileType } from "../types/componentTypes";

import useFileUploadOptimisticMutation from "../async/mutationHooks/files/use-file-upload-optimistic-mutation";
import { fileUpload } from "../async/uploads/file-upload";
import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

export function useFileUploadDrop() {
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
  const { fileUploadOptimisticMutation } = useFileUploadOptimisticMutation();

  const onDrop = useCallback(
    (acceptedFiles: FileType[]) => {
      fileUpload(acceptedFiles, fileUploadOptimisticMutation, CATEGORY_ID);
    },
    [fileUploadOptimisticMutation, CATEGORY_ID],
  );

  return { fileUploadOptimisticMutation, onDrop };
}
