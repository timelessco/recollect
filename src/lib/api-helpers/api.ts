import type { ApiResponse } from "./response";

async function fetchJson<T>(response: Response): Promise<T> {
  // oxlint-disable-next-line no-unsafe-type-assertion -- response.json() types as unknown in oxlint
  return (await response.json()) as T;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = await fetchJson<ApiResponse<T>>(response);

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
  options?: Omit<RequestInit, "body" | "headers" | "method">,
): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  return handleResponse<T>(response);
};

/**
 * GET from internal Next.js API routes.
 * Response must follow ApiResponse<T> shape.
 * Throws on error for React Query onError compatibility.
 */
export const getApi = async <T>(url: string, options?: Omit<RequestInit, "method">): Promise<T> => {
  const response = await fetch(url, options ?? {});

  return handleResponse<T>(response);
};
