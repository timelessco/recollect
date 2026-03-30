import { z } from "zod";

export const InviteInputSchema = z.object({
  token: z.string().meta({ description: "JWT invite token from email link" }),
});

export const InviteOutputSchema = z.object({
  error: z.string().meta({ description: "Error message when invite processing fails" }),
});
