import { useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";

import { useReactQueryMutation } from "@/hooks/use-react-query-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { BOOKMARKS_COUNT_KEY, BOOKMARKS_KEY, V2_SAVE_FROM_DISCOVER_API } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";
import { successToast } from "@/utils/toastMessages";

interface SaveFromDiscoverPayload {
  category_ids: number[];
  source_bookmark_id: number;
}

function handleSaveError(error: Error) {
  if (error instanceof HTTPError && error.response.status === 409) {
    successToast("This bookmark is already in your library");
    return;
  }

  handleClientError(error);
}

export function useSaveFromDiscoverMutation() {
  const queryClient = useQueryClient();
  const userId = useSupabaseSession((state) => state.session)?.user?.id ?? "";

  return useReactQueryMutation<unknown, Error, SaveFromDiscoverPayload>({
    mutationFn: (payload) => api.post(V2_SAVE_FROM_DISCOVER_API, { json: payload }).json(),
    mutationKey: ["save-from-discover"],
    onError: (error) => {
      handleSaveError(error);
    },
    onSettled: (_data, error) => {
      if (!error) {
        void queryClient.invalidateQueries({ queryKey: [BOOKMARKS_KEY, userId] });
        void queryClient.invalidateQueries({ queryKey: [BOOKMARKS_COUNT_KEY, userId] });
      }
    },
    showSuccessToast: true,
    skipErrorHandling: true,
    successMessage: "Bookmark saved",
  });
}
