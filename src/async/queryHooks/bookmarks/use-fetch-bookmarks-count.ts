import { useQuery } from "@tanstack/react-query";

import type { FetchBookmarksCountOutputSchema } from "@/app/api/v2/bookmark/fetch-bookmarks-count/schema";
import type { BookmarksCountTypes } from "@/types/apiTypes";
import type { z } from "zod";

import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { BOOKMARKS_COUNT_KEY, V2_FETCH_BOOKMARKS_COUNT_API } from "@/utils/constants";

type V2CountResponse = z.infer<typeof FetchBookmarksCountOutputSchema>;

/** Maps v2 response field names to legacy BookmarksCountTypes (temporary — removed when BookmarksCountTypes is retired) */
function mapToBookmarksCountTypes(data: V2CountResponse): BookmarksCountTypes {
  return {
    audio: data.audioCount,
    categoryCount: data.categoryCount,
    documents: data.documentsCount,
    everything: data.allCount,
    images: data.imagesCount,
    instagram: data.instagramCount,
    links: data.linksCount,
    trash: data.trashCount,
    tweets: data.tweetsCount,
    uncategorized: data.uncategorizedCount,
    videos: data.videosCount,
  };
}

export default function useFetchBookmarksCount() {
  const session = useSupabaseSession((state) => state.session);

  const { data: bookmarksCountData } = useQuery({
    queryFn: async () => {
      const data = await api.get(V2_FETCH_BOOKMARKS_COUNT_API).json<V2CountResponse>();
      return mapToBookmarksCountTypes(data);
    },
    queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
  });

  return {
    bookmarksCountData,
  };
}
