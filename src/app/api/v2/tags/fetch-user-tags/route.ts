import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { TAG_TABLE_NAME } from "@/utils/constants";

import { FetchUserTagsInputSchema, FetchUserTagsOutputSchema } from "./schema";

const ROUTE = "v2-tags-fetch-user-tags";

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, { userId });

    const { data, error } = await supabase.from(TAG_TABLE_NAME).select("*").eq("user_id", userId);

    if (error) {
      return apiError({
        error,
        message: "Failed to fetch user tags",
        operation: "tags_fetch",
        route,
        userId,
      });
    }

    return data;
  },
  inputSchema: FetchUserTagsInputSchema,
  outputSchema: FetchUserTagsOutputSchema,
  route: ROUTE,
});
