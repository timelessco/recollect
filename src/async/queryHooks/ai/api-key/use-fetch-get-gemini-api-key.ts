import { useQuery } from "@tanstack/react-query";

import type { GetGeminiApiKeyOutputSchema } from "@/app/api/v2/get-gemini-api-key/schema";
import type { z } from "zod";

import { api } from "@/lib/api-helpers/api-v2";
import { GET_API_KEY_KEY, V2_GET_GEMINI_API_KEY_API } from "@/utils/constants";

type GetGeminiApiKeyResponse = z.infer<typeof GetGeminiApiKeyOutputSchema>;

const useFetchGetApiKey = () =>
  useQuery({
    enabled: false,
    queryFn: () => api.get(V2_GET_GEMINI_API_KEY_API).json<GetGeminiApiKeyResponse>(),
    queryKey: [GET_API_KEY_KEY],
  });

export default useFetchGetApiKey;
