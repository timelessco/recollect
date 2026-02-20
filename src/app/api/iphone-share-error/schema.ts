import { z } from "zod";

import { isNullable } from "@/utils/assertion-utils";

export const IphoneShareErrorPayloadSchema = z.object({
	message: z
		.string({
			error: (issue) =>
				isNullable(issue.input)
					? "Error message is required"
					: "Error message must be a string",
		})
		.min(1, { error: "Error message cannot be empty" }),
	stackTrace: z.string().optional(),
	deviceInfo: z
		.object({
			model: z.string().optional(),
			osVersion: z.string().optional(),
			appVersion: z.string().optional(),
		})
		.optional(),
	context: z
		.object({
			screen: z.string().optional(),
			action: z.string().optional(),
		})
		.optional(),
});

export const IphoneShareErrorResponseSchema = z.object({
	sentryEventId: z.string(),
});
