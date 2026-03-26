import { z } from "zod";

export const SendEmailInputSchema = z.object({
  category_name: z.string().meta({ description: "Category name for email template" }),
  display_name: z.string().meta({ description: "Sender display name" }),
  emailList: z.email().meta({ description: "Single recipient email address" }),
  url: z.url().meta({ description: "Invite URL for the email link" }),
});

export const SendEmailOutputSchema = z.object({
  id: z.string().meta({
    description: "Resend email ID (or 'skipped-no-resend-key' in dev)",
  }),
});
