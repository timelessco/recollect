import { useCallback } from "react";

import {
	MAX_TAG_COLLECTION_NAME_LENGTH,
	MIN_TAG_COLLECTION_NAME_LENGTH,
} from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";

type ValidateNameArgs = {
	errorId?: string;
	value: string;
	emptyMessage: string;
	lengthMessage: string;
};

/**
 * Shared input validation for short text names (tags, collections, etc.).
 * Returns the trimmed value when valid, or null after surfacing an error.
 */
export const useNameValidation = () => {
	const validateName = useCallback(
		({
			errorId = "validation",
			value,
			emptyMessage,
			lengthMessage,
		}: ValidateNameArgs) => {
			const trimmedValue = typeof value === "string" ? value.trim() : "";

			if (!trimmedValue) {
				handleClientError(errorId, emptyMessage);
				return null;
			}

			if (
				trimmedValue.length < MIN_TAG_COLLECTION_NAME_LENGTH ||
				trimmedValue.length > MAX_TAG_COLLECTION_NAME_LENGTH
			) {
				handleClientError(errorId, lengthMessage);
				return null;
			}

			return trimmedValue;
		},
		[],
	);

	return { validateName };
};
