import { useQuery } from "@tanstack/react-query";

import { checkApiKey } from "../../../supabaseCrudHelpers";

type CheckApiKeyResponse = Awaited<ReturnType<typeof checkApiKey>>;

const useFetchCheckApiKey = () =>
	useQuery<CheckApiKeyResponse>({
		queryKey: ["checkApiKey"],
		queryFn: checkApiKey,
		refetchOnWindowFocus: false,
	});

export default useFetchCheckApiKey;
