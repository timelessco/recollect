import { createDeleteApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import { DeleteApiKeyInputSchema, DeleteApiKeyOutputSchema } from "./schema";

const ROUTE = "v2-delete-api-key";

export const DELETE = createDeleteApiHandlerWithAuth({
  handler: async ({ route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, { userId });

    const { error: updateError } = await supabase
      .from(PROFILES)
      .update({ api_key: null })
      .eq("id", userId);

    if (updateError) {
      return apiError({
        error: updateError,
        message: "Failed to delete API key",
        operation: "api_key_delete",
        route,
        userId,
      });
    }

    console.log(`[${route}] API key deleted successfully:`, { userId });

    return { success: true };
  },
  inputSchema: DeleteApiKeyInputSchema,
  outputSchema: DeleteApiKeyOutputSchema,
  route: ROUTE,
});
