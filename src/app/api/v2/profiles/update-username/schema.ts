import { z } from "zod";

export const UpdateUsernameInputSchema = z.object({
  username: z.string().meta({ description: "New username to set for the profile" }),
});

export const UpdateUsernameOutputSchema = z.array(
  z.object({
    user_name: z.string().nullable().meta({ description: "Updated username" }),
  }),
);
