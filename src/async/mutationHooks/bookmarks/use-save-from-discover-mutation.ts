import { useReactQueryMutation } from "@/hooks/use-react-query-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { V2_SAVE_FROM_DISCOVER_API } from "@/utils/constants";

interface SaveFromDiscoverPayload {
  category_ids: number[];
  source_bookmark_id: number;
}

export function useSaveFromDiscoverMutation() {
  return useReactQueryMutation<unknown, Error, SaveFromDiscoverPayload>({
    mutationFn: (payload) => api.post(V2_SAVE_FROM_DISCOVER_API, { json: payload }).json(),
    mutationKey: ["save-from-discover"],
    showSuccessToast: true,
    successMessage: "Bookmark saved",
  });
}
