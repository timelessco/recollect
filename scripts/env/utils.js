/**
 * @param {import('zod').ZodError<Map<string,string>,string>} errors - The errors to format.
 * @returns {string[]} - The formatted error message.
 */
export function formatErrors(errors) {
	const formattedErrors = [];

	// Handle top-level errors array
	if (
		errors.errors &&
		Array.isArray(errors.errors) &&
		errors.errors.length > 0
	) {
		formattedErrors.push(...errors.errors);
	}

	// Handle nested properties object
	if (errors.properties && typeof errors.properties === "object") {
		for (const [propertyName, propertyValue] of Object.entries(
			errors.properties,
		)) {
			if (propertyValue.errors && Array.isArray(propertyValue.errors)) {
				const errorMessages = propertyValue.errors.join(", ");
				formattedErrors.push(`${propertyName}: ${errorMessages}`);
			}
		}
	}

	// Handle flat error structure with _errors (fallback for other formats)
	if (!errors.properties && !Array.isArray(errors.errors)) {
		for (const [name, value] of Object.entries(errors)) {
			if (value && typeof value === "object" && "_errors" in value) {
				formattedErrors.push(`${name}: ${value._errors.join(", ")}`);
			}
		}
	}

	return formattedErrors;
}
