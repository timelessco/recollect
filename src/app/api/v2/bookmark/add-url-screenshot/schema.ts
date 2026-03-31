import { z } from "zod";

export const AddUrlScreenshotInputSchema = z.object({
  favIcon: z.string().nullable().optional().meta({ description: "Favicon URL if available" }),
  id: z.int().meta({ description: "Bookmark ID to capture screenshot for" }),
  url: z.url().meta({ description: "URL to capture screenshot of" }),
});

const BookmarkScreenshotRow = z.object({
  description: z.string().nullable().meta({ description: "Bookmark description or AI caption" }),
  id: z.int().meta({ description: "Bookmark unique identifier" }),
  meta_data: z.unknown().meta({ description: "Enriched metadata including screenshot URL" }),
  ogImage: z.string().nullable().meta({ description: "Open Graph image URL" }),
  title: z.string().nullable().meta({ description: "Bookmark title" }),
});

export const AddUrlScreenshotOutputSchema = z.array(BookmarkScreenshotRow);
