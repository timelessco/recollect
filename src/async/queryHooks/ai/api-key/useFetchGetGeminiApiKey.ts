import { useQuery } from "@tanstack/react-query";

import { GET_API_KEY_KEY } from "../../../../utils/constants";
import { getGeminiApiKey } from "../../../supabaseCrudHelpers";

type GetApiKeyResponse = Awaited<ReturnType<typeof getGeminiApiKey>>;

const useFetchGetApiKey = () =>
  useQuery<GetApiKeyResponse>({
    enabled: false,
    queryFn: getGeminiApiKey,
    queryKey: [GET_API_KEY_KEY],
  });

export default useFetchGetApiKey;
