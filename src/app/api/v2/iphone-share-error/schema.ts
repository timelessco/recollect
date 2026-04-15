import { z } from "zod";

import { isNullable } from "@/utils/assertion-utils";

export const IphoneShareErrorInputSchema = z.object({
  context: z
    .object({
      action: z
        .string()
        .meta({ description: "High-level action the user was performing." })
        .optional(),
      screen: z
        .string()
        .meta({ description: "Screen identifier where the error occurred." })
        .optional(),
    })
    .meta({ description: "Optional UX context describing what the user was doing." })
    .optional(),
  deviceInfo: z
    .object({
      appVersion: z
        .string()
        .meta({ description: "Installed app version (e.g. `1.2.3`)." })
        .optional(),
      model: z
        .string()
        .meta({ description: "Device model name (e.g. `iPhone 15 Pro`)." })
        .optional(),
      osVersion: z
        .string()
        .meta({ description: "iOS version string (e.g. `iOS 17.2`)." })
        .optional(),
    })
    .meta({ description: "Optional device metadata captured at the time of the error." })
    .optional(),
  message: z
    .string({
      error: (issue) =>
        isNullable(issue.input) ? "Error message is required" : "Error message must be a string",
    })
    .min(1, { error: "Error message cannot be empty" })
    .meta({ description: "Human-readable error message reported by the share extension." }),
  stackTrace: z
    .string()
    .meta({ description: "Optional stack trace (Swift format) captured at throw site." })
    .optional(),
});

export const IphoneShareErrorOutputSchema = z.object({
  sentryEventId: z.string().meta({
    description:
      "Sentry event ID for the captured exception. Use to correlate with Sentry dashboard.",
  }),
});
