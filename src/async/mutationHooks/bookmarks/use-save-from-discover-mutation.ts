import { HTTPError } from "ky";

import { useReactQueryMutation } from "@/hooks/use-react-query-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { V2_SAVE_FROM_DISCOVER_API } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";
import { successToast } from "@/utils/toastMessages";

interface SaveFromDiscoverPayload {
  category_ids: number[];
  source_bookmark_id: number;
}

async function handleSaveError(error: Error) {
  if (error instanceof HTTPError && error.response.status === 409) {
    const body = await error.response.json<{ error: string }>();
    successToast(body.error);
    return;
  }

  handleClientError(error);
}

export function useSaveFromDiscoverMutation() {
  return useReactQueryMutation<unknown, Error, SaveFromDiscoverPayload>({
    mutationFn: (payload) => api.post(V2_SAVE_FROM_DISCOVER_API, { json: payload }).json(),
    mutationKey: ["save-from-discover"],
    onError: (error) => {
      void handleSaveError(error);
    },
    showSuccessToast: true,
    skipErrorHandling: true,
    successMessage: "Bookmark saved",
  });
}
