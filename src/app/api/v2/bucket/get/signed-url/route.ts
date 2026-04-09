import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { R2_MAIN_BUCKET_NAME } from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

import { GetSignedUrlInputSchema, GetSignedUrlOutputSchema } from "./schema";

const ROUTE = "v2-bucket-get-signed-url";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, user }) => {
      const { filePath } = data;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.file_path = filePath;
      }

      const result = await storageHelpers.createSignedUploadUrl(
        R2_MAIN_BUCKET_NAME,
        filePath,
        3600,
      );

      if (result.error) {
        throw new RecollectApiError("service_unavailable", {
          cause:
            result.error instanceof Error ? result.error : new Error(JSON.stringify(result.error)),
          message: "Failed to generate signed URL",
          operation: "generate_signed_url",
        });
      }

      if (!result.data) {
        throw new RecollectApiError("service_unavailable", {
          message: "No signed URL returned",
          operation: "generate_signed_url",
        });
      }

      return { signedUrl: result.data.signedUrl };
    },
    inputSchema: GetSignedUrlInputSchema,
    outputSchema: GetSignedUrlOutputSchema,
    route: ROUTE,
  }),
);
