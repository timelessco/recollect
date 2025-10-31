import { useQuery } from "@tanstack/react-query";

import { API_KEY_CHECK_KEY } from "../../../../utils/constants";
import { checkApiKey } from "../../../supabaseCrudHelpers";

type CheckApiKeyResponse = Awaited<ReturnType<typeof checkApiKey>>;

const useFetchCheckApiKey = () =>
	useQuery<CheckApiKeyResponse>({
		queryKey: [API_KEY_CHECK_KEY],
		queryFn: checkApiKey,
		refetchOnWindowFocus: false,
	});

export default useFetchCheckApiKey;
