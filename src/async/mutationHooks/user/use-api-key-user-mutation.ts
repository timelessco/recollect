import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";
import { handleClientError } from "@/utils/error-utils/client";

import { API_KEY_CHECK_KEY, V2_SAVE_API_KEY_API } from "../../../utils/constants";
import { successToast } from "../../../utils/toastMessages";

interface SaveApiKeyParameters {
  apikey: string;
}

export const useApiKeyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ apikey }: SaveApiKeyParameters) =>
      api.put(V2_SAVE_API_KEY_API, { json: { apikey } }).json(),
    onError: (error) => {
      handleClientError(error, "Failed to update API key. Please try again.");
    },
    onSuccess: async () => {
      successToast("API key saved successfully");
      await queryClient.invalidateQueries({ queryKey: [API_KEY_CHECK_KEY] });
    },
  });
};
