/**
 * Checks if a value is nullable (null or undefined).
 * @template T - The type of the value being checked.
 * @param {T | null | undefined} value - The value to check.
 * @returns {value is null | undefined} - Returns true if the value is null or undefined, false otherwise.
 */
export function isNullable(value: unknown): value is null | undefined {
	// eslint-disable-next-line no-eq-null, eqeqeq
	return value == null;
}

/**
 * Determines whether a value is non-null and non-undefined.
 * @template T - The type of the value to check.
 * @param {T | null | undefined} value - The value to check.
 * @returns {value is T} - Returns true if the value is non-null and non-undefined, false otherwise.
 */
export function isNonNullable<T>(value: null | T | undefined): value is T {
	return !isNullable(value);
}

// Cannot have isEmptyArray variant because of no NonEmptyArray type guard
/**
 * Represents a non-empty array.
 * @template T - The type of elements in the array.
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Checks if the provided array is non-empty.
 * @template T - The type of elements in the array.
 * @param {T[]} array - The array to check.
 * @returns {boolean} - Returns true if the array is non-empty, false otherwise.
 */
export function isNonEmptyArray<T>(array: T[]): array is NonEmptyArray<T> {
	return Array.isArray(array) && array.length > 0;
}

/**
 * Checks if a value is a non-empty string.
 * @param {string} value - The value to check.
 * @returns {boolean} - Returns true if the value is a non-empty string, false otherwise.
 */
export function isEmptyString(value: null | string | undefined) {
	return isNonNullable(value) ? value.trim() === "" : false;
}

/**
 * Checks if a value is a non-empty string.
 * @param {string} value - The value to check.
 * @returns {value is string} - Returns true if the value is a non-empty string, false otherwise.
 */
export function isNonEmptyString(value: string): value is string {
	return !isEmptyString(value);
}
