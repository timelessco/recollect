import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_KEY_CHECK_KEY } from "../../../utils/constants";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { saveApiKey } from "../../supabaseCrudHelpers";

type SaveApiKeyParameters = {
	apikey: string;
};

type ApiKeyResponse = {
	data: {
		api_key: string;
		id: string;
	};
	message: string;
};

export const useApiKeyMutation = () => {
	const queryClient = useQueryClient();

	return useMutation<ApiKeyResponse, Error, SaveApiKeyParameters>({
		mutationFn: async ({ apikey }) => {
			const response = await saveApiKey({ apikey });
			// saveApiKey already throws/returns error-like object; let the caller handle toast via mutationApiCall if used
			return response as unknown as ApiKeyResponse;
		},
		onSuccess: async () => {
			successToast("API key saved successfully");
			// Invalidate the API key check query to refetch the latest status
			await queryClient.invalidateQueries({ queryKey: [API_KEY_CHECK_KEY] });
		},
		onError: (error) => {
			errorToast(
				error.message || "Failed to update API key. Please try again.",
			);
		},
	});
};
