import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { uploadFileRemainingData } from "@/lib/files/upload-file-remaining-data";

import { UploadFileRemainingDataInputSchema, UploadFileRemainingDataOutputSchema } from "./schema";

const ROUTE = "v2-file-upload-file-remaining-data";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      await uploadFileRemainingData({
        id: data.id,
        mediaType: data.mediaType,
        publicUrl: data.publicUrl,
        supabase,
        userId: user.id,
      });

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.bookmark_id = data.id;
        ctx.fields.media_type = data.mediaType;
      }

      return { status: "completed" };
    },
    inputSchema: UploadFileRemainingDataInputSchema,
    outputSchema: UploadFileRemainingDataOutputSchema,
    route: ROUTE,
  }),
);
