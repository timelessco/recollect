import { useMutation } from "@tanstack/react-query";

import { getBaseUrl } from "../../../utils/constants";

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
			const response = await fetch(getBaseUrl() + "api/v1/api-key", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ apikey }),
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.error || "Failed to save API key");
			}

			return await response.json();
		},
		onSuccess: () => {
			// Success handled in the component
		},
		onError: () => {
			// Error handled in the component
		},
	});
