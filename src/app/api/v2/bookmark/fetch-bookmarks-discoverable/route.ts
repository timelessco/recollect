import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createApiClient } from "@/lib/supabase/api";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "@/utils/constants";

import {
  V2FetchBookmarksDiscoverableInputSchema,
  V2FetchBookmarksDiscoverableOutputSchema,
} from "./schema";

const ROUTE = "v2-bookmark-fetch-bookmarks-discoverable";

const getRange = (page: number) => {
  const rangeStart = page * PAGINATION_LIMIT;
  const rangeEnd = (page + 1) * PAGINATION_LIMIT - 1;

  return { rangeEnd, rangeStart };
};

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const { page } = input;
      const { rangeEnd, rangeStart } = getRange(page);

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.page = page;
        ctx.fields.range_start = rangeStart;
        ctx.fields.range_end = rangeEnd;
      }

      const { supabase } = await createApiClient();

      const { data, error } = await supabase
        .from(MAIN_TABLE_NAME)
        .select(
          `
          id,
          inserted_at,
          title,
          url,
          description,
          ogImage,
          screenshot,
          trash,
          type,
          meta_data,
          sort_index,
          make_discoverable
        `,
        )
        .is("trash", null)
        .not("make_discoverable", "is", null)
        .order("make_discoverable", { ascending: true })
        .range(rangeStart, rangeEnd);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to fetch discoverable bookmarks",
          operation: "fetch_discoverable_bookmarks",
        });
      }

      if (ctx?.fields) {
        ctx.fields.result_count = data.length;
      }

      return data;
    },
    inputSchema: V2FetchBookmarksDiscoverableInputSchema,
    outputSchema: V2FetchBookmarksDiscoverableOutputSchema,
    route: ROUTE,
  }),
);
