"use client";

import { useEffect, useMemo, useRef } from "react";

import { useQuery } from "@tanstack/react-query";

import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";

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
   * Callback invoked on query error (v5 workaround)
   */
  onError?: (error: TError) => void;
  /**
   * Callback invoked on query success (v5 workaround)
   */
  onSuccess?: (data: TData) => void;
  /**
   * Show success toast when query succeeds (default: false)
   */
  showSuccessToast?: boolean;
  /**
   * Skip built-in error handling (default: false)
   */
  skipErrorHandling?: boolean;
  /**
   * Success message to display
   */
  successMessage?: string;
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
    onError,
    onSuccess,
    showSuccessToast = false,
    skipErrorHandling = false,
    successMessage,
    ...restOptions
  } = options;

  const queryResult = useQuery(restOptions);

  // Track whether callbacks have been invoked for current query
  const hasHandledSuccessRef = useRef(false);
  const hasHandledErrorRef = useRef(false);

  // Stabilize queryKey reference for dependency tracking
  const stableQueryKey = useMemo(() => restOptions.queryKey, [restOptions.queryKey]);

  // Reset handlers when queryKey changes (new query)
  useEffect(() => {
    if (stableQueryKey) {
      hasHandledSuccessRef.current = false;
      hasHandledErrorRef.current = false;
    }
  }, [stableQueryKey]);

  // Handle success (v5 workaround for removed onSuccess)
  useEffect(() => {
    if (queryResult.isSuccess && !hasHandledSuccessRef.current) {
      hasHandledSuccessRef.current = true;

      if (showSuccessToast && successMessage) {
        handleSuccess(successMessage);
      }

      onSuccess?.(queryResult.data);
    }
  }, [queryResult.isSuccess, queryResult.data, showSuccessToast, successMessage, onSuccess]);

  // Handle error (v5 workaround for removed onError)
  useEffect(() => {
    if (queryResult.isError && !hasHandledErrorRef.current) {
      hasHandledErrorRef.current = true;

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
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
    ...options,
  });
}
