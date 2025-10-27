import { useMutation } from "@tanstack/react-query";
import CryptoJS from "crypto-js";

import { saveApiKey } from "../../supabaseCrudHelpers";

const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY;

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
			const encrypted = CryptoJS.AES.encrypt(
				apikey,
				SECRET_KEY as string,
			).toString();

			const response = await saveApiKey({ apikey: encrypted });
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
