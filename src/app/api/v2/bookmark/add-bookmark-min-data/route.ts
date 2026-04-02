import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { addBookmarkMinData } from "@/lib/bookmarks/add-bookmark-min-data";

import { AddBookmarkMinDataInputSchema, AddBookmarkMinDataOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-add-bookmark-min-data";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: ({ data, supabase, user }) =>
      addBookmarkMinData({
        categoryId: data.category_id,
        email: user.email,
        supabase,
        updateAccess: data.update_access,
        url: data.url,
        userId: user.id,
      }),
    inputSchema: AddBookmarkMinDataInputSchema,
    outputSchema: AddBookmarkMinDataOutputSchema,
    route: ROUTE,
  }),
);
