import { z } from "zod";

export const RevalidateInputSchema = z.object({
  path: z.string().min(1).meta({ description: "Path to revalidate in the Next.js cache" }),
});

export const RevalidateOutputSchema = z.object({
  revalidated: z.boolean().meta({ description: "Whether revalidation succeeded" }),
});
