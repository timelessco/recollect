import { z } from "zod/v4";

export const SendCollaborationEmailInputSchema = z.object({
  category_id: z.int().min(0).meta({ description: "ID of the category to share" }),
  edit_access: z.boolean().meta({ description: "Whether the collaborator gets edit permissions" }),
  emailList: z
    .array(z.email())
    .min(1)
    .meta({ description: "Recipient email addresses (currently only the first is used)" }),
  hostUrl: z.url().meta({ description: "Base URL for invite link construction (client-provided)" }),
});

export const SendCollaborationEmailOutputSchema = z.object({
  url: z
    .string()
    .meta({ description: "Invite URL (always returned; in dev mode email send is skipped)" }),
});
