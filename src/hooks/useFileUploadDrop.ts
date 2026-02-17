import { useCallback } from "react";

import useFileUploadOptimisticMutation from "../async/mutationHooks/files/useFileUploadOptimisticMutation";
import { fileUpload } from "../async/uploads/file-upload";
import { type FileType } from "../types/componentTypes";

import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

export function useFileUploadDrop() {
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { fileUploadOptimisticMutation } = useFileUploadOptimisticMutation();

	const onDrop = useCallback(
		async (acceptedFiles: FileType[]) => {
			await fileUpload(
				acceptedFiles,
				fileUploadOptimisticMutation,
				CATEGORY_ID,
			);
		},
		[fileUploadOptimisticMutation, CATEGORY_ID],
	);

	return { onDrop, fileUploadOptimisticMutation };
}
