import { revalidatePath } from "next/cache";

import { createPostApiHandlerWithSecret } from "@/lib/api-helpers/create-handler";

import { RevalidateInputSchema, RevalidateOutputSchema } from "./schema";

const ROUTE = "v2-revalidate";

export const POST = createPostApiHandlerWithSecret({
  handler: ({ input, route }) => {
    console.log(`[${route}] Revalidating path:`, { path: input.path });

    revalidatePath(input.path);

    console.log(`[${route}] Successfully revalidated:`, {
      path: input.path,
    });

    return { revalidated: true };
  },
  inputSchema: RevalidateInputSchema,
  outputSchema: RevalidateOutputSchema,
  route: ROUTE,
  secretEnvVar: "REVALIDATE_SECRET_TOKEN",
});
