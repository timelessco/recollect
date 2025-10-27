import { useMutation } from "@tanstack/react-query";
import CryptoJS from "crypto-js";

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
			if (!SECRET_KEY) {
				throw new Error("NEXT_PUBLIC_SECRET_KEY is not defined");
			}

			const encrypted = CryptoJS.AES.encrypt(apikey, SECRET_KEY).toString();
			const response = await fetch("/api/v1/api-key", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ apikey: encrypted }),
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
