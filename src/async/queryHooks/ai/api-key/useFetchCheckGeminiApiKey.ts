import { useQuery } from "@tanstack/react-query";

import { API_KEY_CHECK_KEY } from "../../../../utils/constants";
import { checkGeminiApiKey } from "../../../supabaseCrudHelpers";

export const useFetchCheckApiKey = () =>
  useQuery({
    queryFn: checkGeminiApiKey,
    queryKey: [API_KEY_CHECK_KEY],
  });
