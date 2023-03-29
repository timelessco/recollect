/**
 * @template T
 * @param {T} x
 * @returns {x is NonNullable<T>}
 */
const isNonNullable = (x) => {
	if (x === null || x === undefined || Number.isNaN(x)) {
		return false;
	}

	return true;
};

/**
 * @param {import('zod').ZodFormattedError<Map<string,string>,string>} errors
 * @returns {string}
 */
export const formatErrors = (errors) => {
	if (!errors) {
		return "";
	}

	return Object.entries(errors)
		.map(([name, value]) => {
			if (value && "_errors" in value) {
				return `${name}: ${value._errors.join(", ")}\n`;
			}

			return null;
		})
		.filter(isNonNullable);
};
