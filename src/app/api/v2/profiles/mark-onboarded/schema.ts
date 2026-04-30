import { z } from "zod";

export const MarkOnboardedInputSchema = z.object({});

export const MarkOnboardedOutputSchema = z
  .object({})
  .meta({ description: "Empty response — success is conveyed by HTTP 200" });
