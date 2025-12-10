import axios, { type AxiosRequestConfig } from "axios";

import { ApplicationError } from "@/utils/error-utils/common";
import { vet } from "@/utils/try";

/**
 * API response shape from App Router endpoints.
 * Success: { data: T, error: null }
 * Error: { data: null, error: string }
 */
type ApiResponse<T> = { data: T; error: null } | { data: null; error: string };

/**
 * Typed axios wrapper using vet for error handling.
 * Extracts data and throws ApplicationError on failure.
 * @example
 * const data = await vetAxios.post<BookmarkData>("/api/bookmarks", payload);
 * // data is typed as BookmarkData
 * // Throws ApplicationError if API returns error
 */
export const vetAxios = {
	async post<T>(
		url: string,
		data?: unknown,
		config?: AxiosRequestConfig,
	): Promise<T> {
		const result = await vet(() =>
			axios.post<ApiResponse<T>>(url, data, config),
		);

		if (result.isErr()) {
			const axiosError = result.error as {
				response?: { data?: { error?: string } };
			};
			const message = axiosError.response?.data?.error || result.error.message;
			throw new ApplicationError(message, result.error);
		}

		const response = result.value;

		if (response.data.error !== null) {
			throw new ApplicationError(response.data.error);
		}

		return response.data.data;
	},

	async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
		const result = await vet(() => axios.get<ApiResponse<T>>(url, config));

		if (result.isErr()) {
			const axiosError = result.error as {
				response?: { data?: { error?: string } };
			};
			const message = axiosError.response?.data?.error || result.error.message;
			throw new ApplicationError(message, result.error);
		}

		const response = result.value;

		if (response.data.error !== null) {
			throw new ApplicationError(response.data.error);
		}

		return response.data.data;
	},
};
