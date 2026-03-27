import { z } from "zod";

// Input schema — mirrors v1 request body fields
export const TestFileUploadInputSchema = z.object({
  category_id: z
    .string()
    .meta({ description: "Category ID to associate the bookmark with (string-typed from client)" }),
  name: z.string().meta({ description: "Original file name" }),
  thumbnailPath: z
    .string()
    .nullable()
    .meta({ description: "Path to video thumbnail in storage (null for non-video files)" }),
  type: z.string().meta({ description: "MIME type of the uploaded file" }),
  uploadFileNamePath: z.string().meta({ description: "Sanitized file path in storage bucket" }),
});

export type TestFileUploadInput = z.infer<typeof TestFileUploadInputSchema>;

// Output schema — bookmark ID returned after insert
// The factory wraps this in { data: <output>, error: null } automatically
export const TestFileUploadOutputSchema = z
  .array(
    z.object({
      id: z.int().meta({ description: "Bookmark ID" }),
    }),
  )
  .meta({ description: "Array of created bookmark records" });

export type TestFileUploadOutput = z.infer<typeof TestFileUploadOutputSchema>;
