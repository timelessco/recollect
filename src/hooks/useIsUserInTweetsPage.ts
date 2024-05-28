import { useRouter } from "next/router";

import { TWEETS_URL } from "../utils/constants";

const useIsUserInTweetsPage = () => {
	const router = useRouter();
	const categorySlug = router?.asPath?.split("/")?.[1] || null;

	return categorySlug === TWEETS_URL;
};

export default useIsUserInTweetsPage;
