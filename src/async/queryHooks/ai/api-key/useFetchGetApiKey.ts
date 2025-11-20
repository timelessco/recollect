import { useQuery } from "@tanstack/react-query";

import { GET_API_KEY_KEY } from "../../../../utils/constants";
import { getApiKey } from "../../../supabaseCrudHelpers";

type GetApiKeyResponse = Awaited<ReturnType<typeof getApiKey>>;

const useFetchGetApiKey = () =>
	useQuery<GetApiKeyResponse>({
		queryKey: [GET_API_KEY_KEY],
		queryFn: getApiKey,
		refetchOnWindowFocus: false,
		enabled: false,
	});

export default useFetchGetApiKey;
