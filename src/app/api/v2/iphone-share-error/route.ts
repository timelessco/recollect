import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { captureIphoneShareError } from "@/lib/api-helpers/iphone-share-error-capture";
import { getServerContext } from "@/lib/api-helpers/server-context";

import { IphoneShareErrorInputSchema, IphoneShareErrorOutputSchema } from "./schema";

const ROUTE = "v2-iphone-share-error";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: ({ data, user }) => {
      const { context, deviceInfo, message, stackTrace } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.device_model = deviceInfo?.model;
        ctx.fields.os_version = deviceInfo?.osVersion;
        ctx.fields.app_version = deviceInfo?.appVersion;
        ctx.fields.action = context?.action;
        ctx.fields.screen = context?.screen;
        ctx.fields.has_stack_trace = Boolean(stackTrace);
      }

      const sentryEventId = captureIphoneShareError({
        context,
        deviceInfo,
        message,
        stackTrace,
        userId,
      });

      if (ctx?.fields) {
        ctx.fields.sentry_event_id = sentryEventId;
        ctx.fields.captured = true;
      }

      return { sentryEventId };
    },
    inputSchema: IphoneShareErrorInputSchema,
    outputSchema: IphoneShareErrorOutputSchema,
    route: ROUTE,
  }),
);
