import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { captureIphoneShareError } from "@/lib/api-helpers/iphone-share-error-capture";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

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
      }
      setPayload(ctx, {
        device_model: deviceInfo?.model,
        os_version: deviceInfo?.osVersion,
        app_version: deviceInfo?.appVersion,
        action: context?.action,
        screen: context?.screen,
        has_stack_trace: Boolean(stackTrace),
      });

      const sentryEventId = captureIphoneShareError({
        context,
        deviceInfo,
        message,
        stackTrace,
        userId,
      });

      if (ctx?.fields) {
        ctx.fields.sentry_event_id = sentryEventId;
      }
      setPayload(ctx, { captured: true });

      return { sentryEventId };
    },
    inputSchema: IphoneShareErrorInputSchema,
    outputSchema: IphoneShareErrorOutputSchema,
    route: ROUTE,
  }),
);
