import find from "lodash/find";

import useAddBookmarkMinDataOptimisticMutation from "../async/mutationHooks/bookmarks/use-add-bookmark-min-data-optimistic-mutation";
import useFetchCategories from "../async/queryHooks/category/use-fetch-categories";
import { bucketCategory, emitClientEvent } from "../lib/api-helpers/axiom-client-events";
import { useSupabaseSession } from "../store/componentStore";
import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

export function useAddBookmark() {
  const session = useSupabaseSession((state) => state.session);
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
  const { allCategories } = useFetchCategories();

  const { addBookmarkMinDataOptimisticMutation } = useAddBookmarkMinDataOptimisticMutation();

  const onAddBookmark = (url: string) => {
    const hasProtocol = url?.startsWith("http://") || url?.startsWith("https://");
    const finalUrl = hasProtocol ? url : `https://${url}`;

    const currentCategory = find(allCategories, (item) => item?.id === CATEGORY_ID);

    const updateAccessCondition =
      typeof CATEGORY_ID === "number"
        ? find(currentCategory?.collabData, (item) => item?.userEmail === session?.user?.email)
            ?.edit_access === true || currentCategory?.user_id?.id === session?.user?.id
        : true;

    const startedAt = performance.now();
    const categoryBucket = bucketCategory(CATEGORY_ID);

    addBookmarkMinDataOptimisticMutation.mutate(
      {
        category_id: CATEGORY_ID,
        update_access: updateAccessCondition,
        url: finalUrl,
      },
      {
        onSuccess: (data) => {
          const firstResult = data?.[0];
          emitClientEvent("bookmark_add_submit", {
            duration_ms: Math.round(performance.now() - startedAt),
            category_bucket: categoryBucket,
            had_og_image: Boolean(firstResult?.ogImage),
            result_count: data?.length ?? 0,
          });
        },
      },
    );
  };

  return { onAddBookmark };
}
