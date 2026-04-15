import { z } from "zod";

export const UploadFileInputSchema = z.object({
  category_id: z.int().min(0).meta({ description: "Target category ID (0 = uncategorized)" }),
  name: z.string().meta({ description: "Original file name" }),
  thumbnailPath: z
    .string()
    .nullable()
    .optional()
    .meta({ description: "R2 path to client-uploaded thumbnail (videos and PDFs)" }),
  type: z.string().meta({ description: "File MIME type" }),
  uploadFileNamePath: z.string().meta({ description: "R2 storage key/path for the uploaded file" }),
});

const InsertedBookmarkRow = z.object({
  id: z.int().meta({ description: "Inserted bookmark ID" }),
});

export const UploadFileOutputSchema = z.array(InsertedBookmarkRow);
