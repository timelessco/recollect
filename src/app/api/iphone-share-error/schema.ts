import { z } from "zod";

import { isNullable } from "@/utils/assertion-utils";

export const IphoneShareErrorPayloadSchema = z.object({
  context: z
    .object({
      action: z.string().optional(),
      screen: z.string().optional(),
    })
    .optional(),
  deviceInfo: z
    .object({
      appVersion: z.string().optional(),
      model: z.string().optional(),
      osVersion: z.string().optional(),
    })
    .optional(),
  message: z
    .string({
      error: (issue) =>
        isNullable(issue.input) ? "Error message is required" : "Error message must be a string",
    })
    .min(1, { error: "Error message cannot be empty" }),
  stackTrace: z.string().optional(),
});

export const IphoneShareErrorResponseSchema = z.object({
  sentryEventId: z.string(),
});
