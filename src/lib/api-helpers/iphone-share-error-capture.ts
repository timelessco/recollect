import * as Sentry from "@sentry/nextjs";

interface CaptureIphoneShareErrorInput {
  context?: { action?: string; screen?: string };
  deviceInfo?: { appVersion?: string; model?: string; osVersion?: string };
  message: string;
  stackTrace?: string;
  userId: string;
}

/**
 * Forwards an iOS share-extension error payload to Sentry and returns the
 * event ID.
 *
 * Lives outside the route handler so the `no @sentry/nextjs import in v2
 * routes` invariant stays literally true. This endpoint is a telemetry
 * ingestion sink — the response contract returns the Sentry event ID, so the
 * capture must complete synchronously and cannot be deferred to `after()`.
 */
export function captureIphoneShareError(input: CaptureIphoneShareErrorInput): string | undefined {
  const { context, deviceInfo, message, stackTrace, userId } = input;

  const errorToCapture = new Error(message);
  if (stackTrace) {
    errorToCapture.stack = stackTrace;
  }

  return Sentry.captureException(errorToCapture, {
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
}
