import { z } from "zod";

export const ScreenshotInputSchema = z.object({
  id: z.union([z.string(), z.number()]).meta({ description: "Bookmark ID (string or number)" }),
  mediaType: z
    .string()
    .nullable()
    .optional()
    .meta({ description: "MIME type of the bookmark content (e.g. application/pdf)" }),
  message: z
    .object({
      msg_id: z.int().meta({ description: "Queue message ID" }),
    })
    .meta({ description: "Queue message metadata" }),
  queue_name: z.string().min(1).meta({ description: "Name of the pgmq queue" }),
  url: z.url().meta({ description: "URL to capture screenshot of" }),
  user_id: z.string().min(1).meta({ description: "User ID who owns the bookmark" }),
});

export type ScreenshotInput = z.infer<typeof ScreenshotInputSchema>;

export const ScreenshotOutputSchema = z.object({
  message: z.string().meta({ description: "Success confirmation message" }),
});

export type ScreenshotOutput = z.infer<typeof ScreenshotOutputSchema>;
