import { useRouter } from "next/router";

export const useIsPublicPage = () => {
	const router = useRouter();

	return router.pathname.startsWith("/public");
};
