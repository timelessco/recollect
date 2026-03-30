import { z } from "zod";

export const AddRemainingBookmarkDataInputSchema = z.object({
  favIcon: z.string().nullable().optional().meta({ description: "Favicon URL if available" }),
  id: z.int().meta({ description: "Bookmark ID to enrich" }),
  url: z.url().meta({ description: "Bookmark URL for enrichment processing" }),
});

export const AddRemainingBookmarkDataOutputSchema = z.object({
  status: z.string().meta({ description: "Processing status" }),
});
