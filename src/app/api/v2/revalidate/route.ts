import { revalidatePath } from "next/cache";

import { createAxiomRouteHandler, withSecret } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

import { RevalidateInputSchema, RevalidateOutputSchema } from "./schema";

const ROUTE = "v2-revalidate";

export const POST = createAxiomRouteHandler(
  withSecret({
    handler: ({ input }) => {
      const ctx = getServerContext();
      setPayload(ctx, { revalidated_path: input.path });

      revalidatePath(input.path);

      setPayload(ctx, { revalidated: true });

      return { revalidated: true };
    },
    inputSchema: RevalidateInputSchema,
    outputSchema: RevalidateOutputSchema,
    route: ROUTE,
    secretEnvVar: "REVALIDATE_SECRET_TOKEN",
  }),
);
