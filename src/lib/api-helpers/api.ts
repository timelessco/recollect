import { type ApiResponse } from "./response";

const handleResponse = async <T>(response: Response): Promise<T> => {
	const json = (await response.json()) as ApiResponse<T>;

	if (!response.ok || json.error !== null) {
		throw new Error(json.error ?? `Request failed: ${response.status}`);
	}

	return json.data;
};

/**
 * POST to internal Next.js API routes.
 * Response must follow ApiResponse<T> shape.
 * Throws on error for React Query onError compatibility.
 */
export const postApi = async <T>(
	url: string,
	body?: unknown,
	options?: Omit<RequestInit, "method" | "body" | "headers">,
): Promise<T> => {
	const response = await fetch(url, {
		...options,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
	});

	return await handleResponse<T>(response);
};

/**
 * GET from internal Next.js API routes.
 * Response must follow ApiResponse<T> shape.
 * Throws on error for React Query onError compatibility.
 */
export const getApi = async <T>(
	url: string,
	options?: Omit<RequestInit, "method">,
): Promise<T> => {
	const response = await fetch(url, options ?? {});

	return await handleResponse<T>(response);
};
