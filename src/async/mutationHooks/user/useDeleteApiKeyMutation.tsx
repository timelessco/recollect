import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_KEY_CHECK_KEY } from "../../../utils/constants";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { deleteApiKey } from "../../supabaseCrudHelpers";

type DeleteApiKeyResponse = {
	data: {
		api_key: null;
		id: string;
	};
	message: string;
};

export const useDeleteApiKeyMutation = () => {
	const queryClient = useQueryClient();

	return useMutation<DeleteApiKeyResponse, Error>({
		mutationFn: async () => {
			const response = await deleteApiKey();
			return response as unknown as DeleteApiKeyResponse;
		},
		onSuccess: async () => {
			successToast("API key deleted successfully");
			// Invalidate the API key check query to refetch the latest status
			await queryClient.invalidateQueries({ queryKey: [API_KEY_CHECK_KEY] });
		},
		onError: () => {
			errorToast("Failed to delete API key");
		},
	});
};
