"use client";

import { useEffect, useMemo, useRef } from "react";
import {
	useQuery,
	type QueryKey,
	type UseQueryOptions,
} from "@tanstack/react-query";

import { handleClientError, handleSuccess } from "@/utils/error-utils/client";

/**
 * Extended query options with UI handling flags.
 * Note: onSuccess/onError/onSettled were removed from useQuery in v5,
 * so we implement them via useEffect.
 */
export interface ReactQueryOptions<
	TQueryFnData,
	TError,
	TData,
	TQueryKey extends QueryKey,
> extends UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
	/**
	 * Callback invoked on query success (v5 workaround)
	 */
	onSuccess?: (data: TData) => void;
	/**
	 * Callback invoked on query error (v5 workaround)
	 */
	onError?: (error: TError) => void;
	/**
	 * Show success toast when query succeeds (default: false)
	 */
	showSuccessToast?: boolean;
	/**
	 * Success message to display
	 */
	successMessage?: string;
	/**
	 * Skip built-in error handling (default: false)
	 */
	skipErrorHandling?: boolean;
}

/**
 * Wrapper around useQuery with error/success handling.
 *
 * TanStack Query v5 removed onSuccess/onError from queries,
 * so this hook re-implements them via useEffect for convenience.
 * @example
 * const { data } = useReactQuery({
 *   queryKey: ["user", userId],
 *   queryFn: () => fetchUser(userId),
 *   onSuccess: (user) => console.log("Loaded:", user.name),
 * });
 */
export function useReactQuery<
	TQueryFnData = unknown,
	TError = Error,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = readonly unknown[],
>(options: ReactQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
	const {
		showSuccessToast = false,
		skipErrorHandling = false,
		onSuccess,
		onError,
		successMessage,
		...restOptions
	} = options;

	const queryResult = useQuery(restOptions);

	// Track whether callbacks have been invoked for current query
	const hasHandledSuccess = useRef(false);
	const hasHandledError = useRef(false);

	// Stabilize queryKey reference for dependency tracking
	const stableQueryKey = useMemo(
		() => restOptions.queryKey,
		[restOptions.queryKey],
	);

	// Reset handlers when queryKey changes (new query)
	useEffect(() => {
		if (stableQueryKey) {
			hasHandledSuccess.current = false;
			hasHandledError.current = false;
		}
	}, [stableQueryKey]);

	// Handle success (v5 workaround for removed onSuccess)
	useEffect(() => {
		if (queryResult.isSuccess && !hasHandledSuccess.current) {
			hasHandledSuccess.current = true;

			if (showSuccessToast && successMessage) {
				handleSuccess(successMessage);
			}

			onSuccess?.(queryResult.data);
		}
	}, [
		queryResult.isSuccess,
		queryResult.data,
		showSuccessToast,
		successMessage,
		onSuccess,
	]);

	// Handle error (v5 workaround for removed onError)
	useEffect(() => {
		if (queryResult.isError && !hasHandledError.current) {
			hasHandledError.current = true;

			if (!skipErrorHandling) {
				handleClientError(queryResult.error);
			}

			onError?.(queryResult.error);
		}
	}, [queryResult.isError, queryResult.error, skipErrorHandling, onError]);

	return queryResult;
}

/**
 * Query hook that never refetches - for immutable/static data.
 * @example
 * const { data } = useReactQueryImmutable({
 *   queryKey: ["config"],
 *   queryFn: fetchAppConfig,
 * });
 */
export function useReactQueryImmutable<
	TQueryFnData = unknown,
	TError = Error,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = readonly unknown[],
>(options: ReactQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
	return useReactQuery<TQueryFnData, TError, TData, TQueryKey>({
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		...options,
	});
}
