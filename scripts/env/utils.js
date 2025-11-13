/**
 * @param {import('zod').ZodFormattedError<Map<string,string>,string>} errors - The errors to format.
 * @returns {string[]} - The formatted error message.
 */
export function formatErrors(errors) {
	return Object.entries(errors)
		.map(([name, value]) => {
			if ("_errors" in value) {
				return `${name}: ${value._errors.join(", ")}\n`;
			}

			return null;
		})
		.filter(Boolean);
}
