"use client";

import { useCallback } from "react";

import { clientLogger } from "@/lib/api-helpers/axiom-client";

import { errorToast, successToast } from "../toastMessages";
import { ApplicationError, BaseError } from "./common";

export function handleSuccess(message: string) {
  successToast(message);
}

export function useHandleClientError() {
  return useCallback((error: unknown, fallbackMessage?: string, showErrorToast = true) => {
    let title = "Error";
    let errorMessage = "Something went wrong";
    let statusCode: number | undefined;

    if (error instanceof BaseError) {
      title = error.name;
      errorMessage = error.message;
      ({ statusCode } = error);
    } else if (error instanceof ApplicationError) {
      title = error.name;
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // process.env used intentionally — NODE_ENV inlined by Next.js in client utilities
    // Show error details in toast in DEV mode
    if (process.env.NODE_ENV === "development") {
      console.error(error);
      console.error(`${title}: ${errorMessage}`);

      errorToast(`${title}: ${errorMessage}`);
      if (fallbackMessage) {
        errorToast(fallbackMessage);
      }

      return;
    }

    if (showErrorToast) {
      errorToast(fallbackMessage ?? errorMessage);
    }

    // Anything reaching this handler was caught deliberately — it is a known
    // error, not an unhandled crash. Route to Axiom. Uncaught exceptions still
    // reach Sentry via the global handler (instrumentation-client.ts),
    // error boundaries (error.tsx / global-error.tsx), and the server-side
    // onRequestError hook. Mirrors axiom.ts severity split: >=500 -> error,
    // everything else -> warn.
    const payload = {
      operation: "client_error_handler",
      error_name: title,
      error_message: errorMessage,
      fallback_message: fallbackMessage,
    };

    if (statusCode !== undefined && statusCode >= 500) {
      clientLogger.error("client_error", payload);
    } else {
      clientLogger.warn("client_error", payload);
    }
  }, []);
}
