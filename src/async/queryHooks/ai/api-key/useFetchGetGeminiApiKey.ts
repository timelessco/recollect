import { useQuery } from "@tanstack/react-query";

import { GET_API_KEY_KEY } from "../../../../utils/constants";
import { getGeminiApiKey } from "../../../supabaseCrudHelpers";

type GetApiKeyResponse = Awaited<ReturnType<typeof getGeminiApiKey>>;

const useFetchGetApiKey = () =>
	useQuery<GetApiKeyResponse>({
		queryKey: [GET_API_KEY_KEY],
		queryFn: getGeminiApiKey,
		enabled: false,
	});

export default useFetchGetApiKey;
