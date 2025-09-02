import { type NextRouter } from "next/router";

export const getCategorySlugFromRouter = (
	router: NextRouter,
): string | null => {
	if (typeof window === "undefined") return null;
	return router?.asPath?.split("/")?.[1]?.split("?")?.[0] || null;
};
