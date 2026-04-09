import { z } from "zod";

export const MarkOnboardingCompleteInputSchema = z.object({});

export const MarkOnboardingCompleteOutputSchema = z
  .object({})
  .meta({ description: "Empty response — success is conveyed by HTTP 200" });
