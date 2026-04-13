import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";

import { API_KEY_CHECK_KEY, V2_DELETE_API_KEY_API } from "../../../utils/constants";
import { errorToast, successToast } from "../../../utils/toastMessages";

export const useDeleteApiKeyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete(V2_DELETE_API_KEY_API, { json: {} }).json(),
    onError: () => {
      errorToast("Failed to delete API key");
    },
    onSuccess: async () => {
      successToast("API key deleted successfully");
      await queryClient.invalidateQueries({ queryKey: [API_KEY_CHECK_KEY] });
    },
  });
};
