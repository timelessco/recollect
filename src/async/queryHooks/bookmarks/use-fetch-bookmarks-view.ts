import { useQuery } from "@tanstack/react-query";

import type { FetchBookmarksViewOutputSchema } from "@/app/api/v2/bookmark/fetch-bookmarks-view/schema";
import type { z } from "zod";

import useGetCurrentCategoryId from "@/hooks/useGetCurrentCategoryId";
import { api } from "@/lib/api-helpers/api-v2";
import { BOOKMARKS_VIEW, V2_FETCH_BOOKMARKS_VIEW_API } from "@/utils/constants";

type FetchBookmarksViewResponse = z.infer<typeof FetchBookmarksViewOutputSchema>;

export default function useFetchBookmarksView() {
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const { data } = useQuery({
    enabled: typeof CATEGORY_ID === "number",
    queryFn: () =>
      api
        .get(V2_FETCH_BOOKMARKS_VIEW_API, {
          searchParams: { category_id: CATEGORY_ID as number },
        })
        .json<FetchBookmarksViewResponse>(),
    queryKey: [BOOKMARKS_VIEW, CATEGORY_ID],
  });

  return { data };
}
