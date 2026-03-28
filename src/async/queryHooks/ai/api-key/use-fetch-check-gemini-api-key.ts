import { useQuery } from "@tanstack/react-query";

import type { CheckGeminiApiKeyOutputSchema } from "@/app/api/v2/check-gemini-api-key/schema";
import type { z } from "zod";

import { getApi } from "@/lib/api-helpers/api";
import { API_KEY_CHECK_KEY, CHECK_API_KEY_API, NEXT_API_URL } from "@/utils/constants";

type CheckApiKeyResponse = z.infer<typeof CheckGeminiApiKeyOutputSchema>;

export const useFetchCheckApiKey = () =>
  useQuery({
    queryFn: () => getApi<CheckApiKeyResponse>(`${NEXT_API_URL}${CHECK_API_KEY_API}`),
    queryKey: [API_KEY_CHECK_KEY],
  });
