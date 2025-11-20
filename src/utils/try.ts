/**
 * Primitive result tuple which contains a value.
 */
export type OkTuple<T> = [undefined, T];

/**
 * Primitive result tuple which contains an error.
 */
export type ErrorTuple = [Error, undefined];

/**
 * Result tuple which contains a value.
 */
export type TryResultOk<T> = Res<T> & {
	0: undefined;
	1: T;
	error: undefined;
	ok: true;
	or: typeof Try.catch;
	value: T;
};

/**
 * Result tuple which contains an error.
 */
export type TryResultError = Res<never> & {
	0: Error;
	1: undefined;
	error: Error;
	ok: false;
	or: typeof Try.catch;
	value: undefined;
};

/**
 * Result tuple returned from calling `Try.catch(fn)`
 */
export type TryResult<T> = TryResultError | TryResultOk<T>;

/**
 * ## Res
 *
 * This class extends the basic `OkTuple<T>` and `ErrorTuple` types with
 * several convenience methods for accessing data and checking types.
 *
 */
export class Res<T> extends Array {
	/**
	 * Helper to convert a caught exception to an Error instance.
	 * @param {unknown} exception - The exception to convert
	 * @returns {Error} An Error instance
	 */
	static toError = (exception: unknown): Error =>
		exception instanceof Error ? exception : new Error(String(exception));

	/**
	 * Helper methods for instantiating via a tuple.
	 */
	declare 0: Error | undefined;

	declare 1: T | undefined;

	constructor([error, value]: ErrorTuple | OkTuple<T>) {
		super(2);
		this[0] = error;
		this[1] = value;
	}

	static err(exception: unknown): TryResultError {
		return Res.from([Res.toError(exception), undefined]);
	}

	static from(tuple: ErrorTuple): TryResultError;
	static from<G>(tuple: OkTuple<G>): TryResultOk<G>;
	static from<G>(tuple: ErrorTuple | OkTuple<G>): TryResult<G> {
		return new Res(tuple) as TryResult<G>;
	}

	static ok<G>(value: G): TryResultOk<G> {
		return Res.from([undefined, value]);
	}

	/**
	 * Getter which returns the value in the result tuple.
	 * @returns {T | undefined} The value if present, undefined otherwise
	 */
	get value(): T | undefined {
		return this[1];
	}

	/**
	 * Getter which returns the error in the result tuple.
	 * @returns {Error | undefined} The error if present, undefined otherwise
	 */
	get error(): Error | undefined {
		return this[0];
	}

	/**
	 * Getter which returns `true` if the error value is `undefined`.
	 * @returns {boolean} True if no error, false otherwise
	 */
	get ok(): boolean {
		return this.error === undefined;
	}

	/**
	 * Returns true if this is the `TryResultOk<T>` variant.
	 * @returns {boolean} True if this is a success result
	 */
	public isOk(): this is TryResultOk<T> {
		return this.error === undefined;
	}

	/**
	 * Returns true if this is the `TryResultError` variant.
	 * @returns {boolean} True if this is an error result
	 */
	public isErr(): this is TryResultError {
		return this.error !== undefined;
	}

	/**
	 * Will return the value if present otherwise will re-throw the error,
	 * recommended for development only.
	 * @returns {T | never} The value if present, throws otherwise
	 * @see `unwrapOr(fallback)` for a safer option.
	 */
	public unwrap(): never | T {
		if (this.isOk()) {
			return this.value;
		}

		throw new Error(
			`Failed to unwrap result with error: ${this.error?.message}`,
		);
	}

	/**
	 * Will unwrap the result tuple and return the value if present,
	 * otherwise will return the provided fallback.
	 * @param fallback - The fallback value to return if no value is present
	 * @returns The value if present, fallback otherwise
	 */
	public unwrapOr<G>(fallback: G): G | T {
		return this.value ?? fallback;
	}

	/**
	 * Allows chaining multiple try/catch statements together:
	 * ```ts
	 * const url = Try.catch(() => new URL(`${userInput}`))
	 *    .or(() => new URL(`https://${userInput}`))
	 *    .or(() => new URL(`https://${userInput}`.trim()))
	 *    .unwrapOr(new URL(`https://default.com`))
	 * ```
	 * @returns {typeof Try.catch} The Try.catch method for chaining
	 */
	public get or() {
		return Try.catch;
	}

	/**
	 * Converts this to a human readable string.
	 * @returns {string} A string representation of the result
	 */
	public toString(): string {
		return this.ok
			? `Result.Ok(${String(this.value)})`
			: `Result.Error(${this.error?.message})`;
	}

	/**
	 * Custom inspect method for Node.js environments.
	 * @returns {string} A string representation for Node.js inspect
	 */
	[Symbol.for("nodejs.util.inspect.custom")](): string {
		return this.toString();
	}
}

/**
 * ## Try
 *
 * This class provides several utility methods for error handling and catching
 * exceptions and return them as result tuples containing either an error or
 * a value (see `Res` class).
 *
 * ```ts
 * const [error, json] = Try.catch(() => JSON.parse(userData))
 *
 * if (!error) return json.user // type-safe!
 *
 * const result = await Try.catch(fetchUser)  // supports async / await
 *
 * if (result.ok) return result.unwrap()  // powerful result types
 *
 * console.warn(result.error.message) //  exceptions are converted to Errors
 * ```
 *
 * For a more shorthand version see the value-error-tuple (vet) utility,
 * which can be used like so:
 *
 * ```ts
 * import { vet } from '@asleepace/try'
 *
 * return vet(() => response.json()).unwrapOr(defaultValue)
 * ```
 *
 * For more information and detailed usage on the specification:
 * @see https://github.com/asleepace/try
 */

// eslint-disable-next-line unicorn/no-static-only-class, @typescript-eslint/no-extraneous-class
export class Try {
	/**
	 * Simple error handling utility which will invoke the provided function and
	 * catch any thrown errors, the result of the function execution will then be
	 * returned as a result tuple.
	 *
	 * ```ts
	 *  // Simple example for common operations...
	 *  const [error, url] = Try.catch(() => new URL(userInput))  // call synchronously
	 *
	 *  if (error) return console.warn(error.message)
	 *
	 *  const [networkError, response] = await Try.catch(() => fetch(url))  // or async
	 *  const [parsingError, jsonData] = await Try.catch(() => response!.json())
	 *
	 *  if (parsingError) return console.warn(error.message)
	 *
	 *  return jsonData
	 * ```
	 */
	static catch(fn: () => never): TryResultError;
	static catch<T>(fn: () => Promise<T>): Promise<TryResult<T>>;
	static catch<T>(fn: () => T): TryResult<T>;
	static catch<T>(
		fn: () => Promise<T> | T,
	): Promise<TryResult<T>> | TryResult<T> {
		try {
			const output = fn();
			return output instanceof Promise
				? output
						// eslint-disable-next-line promise/prefer-await-to-then
						.then((value) => Res.ok(value))
						// eslint-disable-next-line promise/prefer-await-to-then
						.catch((error: unknown) => Res.err(error))
				: Res.ok(output);
		} catch (error) {
			return Res.err(error);
		}
	}
}

/**
 * ## Value-Error Tuple
 *
 * Shorthand utility for calling `Try.catch(fn)` which returns either
 * a value or error tuple.
 *
 * ```ts
 * // initializing a url from user input
 * const [error, link] = vet(() => new URL(userInput))
 *
 * if (!error) return link.href
 * ```
 */
export const vet = Try.catch.bind(Try);
