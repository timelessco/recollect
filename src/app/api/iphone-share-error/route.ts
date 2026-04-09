import * as Sentry from "@sentry/nextjs";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";

import { IphoneShareErrorPayloadSchema, IphoneShareErrorResponseSchema } from "./schema";

const ROUTE = "iphone-share-error";

export const POST = createPostApiHandlerWithAuth({
  handler: ({ data, route, user }) => {
    const { context, deviceInfo, message, stackTrace } = data;
    const userId = user.id;

    console.log(`[${route}] Error received:`, {
      deviceModel: deviceInfo?.model,
      hasStackTrace: Boolean(stackTrace),
      message,
      userId,
    });

    const errorToCapture = new Error(message);
    if (stackTrace) {
      errorToCapture.stack = stackTrace;
    }

    const sentryEventId = Sentry.captureException(errorToCapture, {
      extra: {
        action: context?.action,
        appVersion: deviceInfo?.appVersion,
        screen: context?.screen,
      },
      tags: {
        device_model: deviceInfo?.model,
        operation: "iphone_share_intent_error",
        os_version: deviceInfo?.osVersion,
        userId,
      },
    });

    console.log(`[${route}] Error sent to Sentry:`, {
      sentryEventId,
      userId,
    });

    return { sentryEventId };
  },
  inputSchema: IphoneShareErrorPayloadSchema,
  outputSchema: IphoneShareErrorResponseSchema,
  route: ROUTE,
});
