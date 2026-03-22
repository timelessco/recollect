import { useQuery } from "@tanstack/react-query";

import type { BookmarkViewDataTypes } from "../../../types/apiTypes";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import { BOOKMARKS_VIEW } from "../../../utils/constants";
import { fetchBookmarksViews } from "../../supabaseCrudHelpers";

// fetchs bookmarks view
export default function useFetchBookmarksView() {
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const { data } = useQuery<{
    data: BookmarkViewDataTypes | null;
    error: Error;
  }>({
    queryFn: () => fetchBookmarksViews({ category_id: CATEGORY_ID }),
    queryKey: [BOOKMARKS_VIEW, CATEGORY_ID],
  });

  return { data };
}
