import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { addRemainingBookmarkData } from "@/lib/bookmarks/add-remaining-bookmark-data";

import {
  AddRemainingBookmarkDataInputSchema,
  AddRemainingBookmarkDataOutputSchema,
} from "./schema";

const ROUTE = "v2-bookmark-add-remaining-bookmark-data";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, supabase, user }) => {
    await addRemainingBookmarkData({
      id: data.id,
      url: data.url,
      favIcon: data.favIcon,
      supabase,
      userId: user.id,
    });

    return { status: "completed" };
  },
  inputSchema: AddRemainingBookmarkDataInputSchema,
  outputSchema: AddRemainingBookmarkDataOutputSchema,
  route: ROUTE,
});
