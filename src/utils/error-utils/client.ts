import * as Sentry from "@sentry/nextjs";

import { errorToast, successToast } from "../toastMessages";

import { ApplicationError, BaseError } from "./common";

export function handleSuccess(message: string) {
	successToast(message);
}

export function handleClientError(
	error: unknown,
	fallbackMessage = "Something went wrong",
	showErrorToast = true,
) {
	let title = "Error";
	let description = fallbackMessage;

	if (error instanceof BaseError) {
		title = error.name;
		description = error.message;
	} else if (error instanceof ApplicationError) {
		title = error.name;
		description = error.message;
	}

	// Show error details in toast in DEV mode
	if (process.env.NODE_ENV === "development") {
		console.error(`${title}: ${description}`);
		console.error(error);
		errorToast(`${title}: ${description}`);

		return;
	}

	if (showErrorToast) {
		errorToast(description);
	}

	Sentry.captureException(error, {
		tags: {
			source: "client_error_handler",
		},
		extra: {
			title,
			description,
		},
	});
}
