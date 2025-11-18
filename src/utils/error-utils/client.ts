import * as Sentry from "@sentry/nextjs";

import { errorToast } from "../toastMessages";

import { ApplicationError, BaseError } from "./common";
import { getErrorMessage } from "./error-message";

export function handleClientError(
	error: unknown,
	fallbackMessage = "Something went wrong",
) {
	let title = "Error";
	let description = fallbackMessage;

	if (error instanceof BaseError) {
		title = error.name;
		description = error.message;
	} else if (error instanceof ApplicationError) {
		title = error.name;
		description = error.message;
	} else {
		description = getErrorMessage(error);
	}

	// Show error details in toast in DEV mode
	if (process.env.NODE_ENV === "development") {
		console.error(`${title}: ${description}`);
		console.error(error);
		errorToast(`${title}: ${description}`);

		return;
	}

	errorToast(description);

	Sentry.captureException(error, {
		extra: {
			errorMessage: `${title}: ${description}`,
		},
	});
}
