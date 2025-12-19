import * as Sentry from "@sentry/nextjs";

import { errorToast, successToast } from "../toastMessages";

import { ApplicationError, BaseError } from "./common";

export function handleSuccess(message: string) {
	successToast(message);
}

export function handleClientError(
	error: unknown,
	fallbackMessage?: string,
	showErrorToast = true,
) {
	let title = "Error";
	let errorMessage = "Something went wrong";

	if (error instanceof BaseError) {
		title = error.name;
		errorMessage = error.message;
	} else if (error instanceof ApplicationError) {
		title = error.name;
		errorMessage = error.message;
	} else if (error instanceof Error) {
		errorMessage = error.message;
	}

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

	Sentry.captureException(error, {
		tags: { source: "client_error_handler" },
		extra: { title, errorMessage, fallbackMessage },
	});
}
