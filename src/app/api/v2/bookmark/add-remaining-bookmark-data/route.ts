import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { addRemainingBookmarkData } from "@/lib/bookmarks/add-remaining-bookmark-data";

import {
  AddRemainingBookmarkDataInputSchema,
  AddRemainingBookmarkDataOutputSchema,
} from "./schema";

const ROUTE = "v2-bookmark-add-remaining-bookmark-data";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      await addRemainingBookmarkData({
        id: data.id,
        url: data.url,
        favIcon: data.favIcon,
        supabase,
        userId: user.id,
      });

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.bookmark_id = data.id;
      }

      return { status: "completed" };
    },
    inputSchema: AddRemainingBookmarkDataInputSchema,
    outputSchema: AddRemainingBookmarkDataOutputSchema,
    route: ROUTE,
  }),
);
