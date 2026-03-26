import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { uploadFileRemainingData } from "@/lib/files/upload-file-remaining-data";

import { UploadFileRemainingDataInputSchema, UploadFileRemainingDataOutputSchema } from "./schema";

const ROUTE = "v2-file-upload-file-remaining-data";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, supabase, user }) => {
    console.log(`[${ROUTE}] API called:`, {
      bookmarkId: data.id,
      mediaType: data.mediaType,
      userId: user.id,
    });

    await uploadFileRemainingData({
      id: data.id,
      mediaType: data.mediaType,
      publicUrl: data.publicUrl,
      supabase,
      userId: user.id,
    });

    return { status: "completed" };
  },
  inputSchema: UploadFileRemainingDataInputSchema,
  outputSchema: UploadFileRemainingDataOutputSchema,
  route: ROUTE,
});
