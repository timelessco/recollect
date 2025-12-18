"use client";

import { createContext as createReactContext, use } from "react";

export interface CreateSafeContextOptions<T> {
	defaultValue?: T | undefined;
	errorMessage?: string | undefined;
	hookName?: string | undefined;
	name?: string | undefined;
	providerName?: string | undefined;
	strict?: boolean | undefined;
}

export type CreateSafeContextReturn<T> = [React.Context<T>, () => T];

function getErrorMessage(hook: string, provider: string) {
	return `${hook} returned \`undefined\`. Seems you forgot to wrap component within ${provider}`;
}

export function createSafeContext<T>(
	options: CreateSafeContextOptions<T> = {},
) {
	const {
		defaultValue,
		errorMessage,
		hookName = "useContext",
		name,
		providerName = "Provider",
		strict = true,
	} = options;

	const Context = createReactContext<T | undefined>(defaultValue);

	Context.displayName = name;

	function useContext() {
		const context = use(Context);

		if (!context && strict) {
			const error = new Error(
				errorMessage ?? getErrorMessage(hookName, providerName),
			);
			error.name = "ContextError";
			throw error;
		}

		return context;
	}

	return [Context, useContext] as CreateSafeContextReturn<T>;
}
