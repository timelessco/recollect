import { isNullable } from "../assertion-utils";

/**
 * Represents an error object with a message.
 */
type ErrorWithMessage = {
	message: string;
};

/**
 * Determines whether a value is an Error object.
 * @param {unknown} error - The value to test.
 * @returns {boolean} True if the value is an Error object, false otherwise.
 */
function isErrorObject(error: unknown): error is Error {
	return error !== null && typeof error === "object";
}

/**
 * Determines if an object is an ErrorWithMessage.
 * @param {unknown} error - The object to check.
 * @returns {boolean} True if the object is an ErrorWithMessage, false otherwise.
 */
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
	return (
		isErrorObject(error) &&
		"message" in error &&
		typeof (error as ErrorWithMessage).message === "string"
	);
}

/**
 * Converts an object to an ErrorWithMessage.
 * @param {unknown} maybeError - The object to convert.
 * @returns {ErrorWithMessage} An ErrorWithMessage object.
 */
function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
	if (isErrorWithMessage(maybeError)) {
		return maybeError;
	}

	try {
		return new Error(JSON.stringify(maybeError));
	} catch {
		// fallback in case there's an error stringification of the maybeError
		// like with circular references for example.
		return new Error(String(maybeError));
	}
}

/**
 * Gets the message property of an ErrorWithMessage object.
 * @param {unknown} error - The ErrorWithMessage object.
 * @returns {string} The message property of the ErrorWithMessage object.
 */
export function getErrorMessage(error: unknown): string {
	return toErrorWithMessage(error).message;
}

/**
 * Adds additional error message to the existing error message.
 * @param {unknown} error - The error object.
 * @param {string} errorMessage - The additional error message to be added.
 * @returns {string} - The updated error message.
 */
export function addAdditionalErrorMessage(
	error: unknown,
	errorMessage?: string,
): string {
	if (isNullable(errorMessage)) {
		return getErrorMessage(error);
	}

	return `${errorMessage}\n\nCause: ${getErrorMessage(error)}`;
}
