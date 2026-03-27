import { z } from "zod";

/** Empty body — user identity comes from auth context */
export const DeleteUserInputSchema = z
  .object({})
  .meta({ description: "Empty body — user identity from auth context" });

export const DeleteUserOutputSchema = z.object({
  user: z.null().meta({ description: "Null — user has been deleted" }),
});
