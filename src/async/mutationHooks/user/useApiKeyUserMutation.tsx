import { useMutation } from "@tanstack/react-query";

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

export const useApiKeyMutation = () =>
	useMutation<ApiKeyResponse, Error, SaveApiKeyParameters>({
		mutationFn: async ({ apikey }) => {
			const response = await saveApiKey({ apikey });
			// saveApiKey already throws/returns error-like object; let the caller handle toast via mutationApiCall if used
			return response as unknown as ApiKeyResponse;
		},
		onSuccess: () => {
			// Success handled in the component
		},
		onError: () => {
			// Error handled in the component
		},
	});
