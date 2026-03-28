import { useQuery } from "@tanstack/react-query";

import type { CheckGeminiApiKeyOutputSchema } from "@/app/api/v2/check-gemini-api-key/schema";
import type { z } from "zod";

import { api } from "@/lib/api-helpers/api-v2";
import { API_KEY_CHECK_KEY } from "@/utils/constants";

type CheckApiKeyResponse = z.infer<typeof CheckGeminiApiKeyOutputSchema>;

export const useFetchCheckApiKey = () =>
  useQuery({
    queryFn: () => api.get("v2/check-gemini-api-key").json<CheckApiKeyResponse>(),
    queryKey: [API_KEY_CHECK_KEY],
  });
