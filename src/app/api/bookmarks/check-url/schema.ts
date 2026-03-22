import { z } from "zod";

export const CheckUrlInputSchema = z.object({
  url: z.string(),
});

export const CheckUrlOutputSchema = z.discriminatedUnion("exists", [
  z.object({ bookmarkId: z.string(), exists: z.literal(true) }),
  z.object({ exists: z.literal(false) }),
]);
