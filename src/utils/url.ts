import { type NextRouter } from "next/router";

export const getCategorySlugFromRouter = (router: NextRouter): string | null =>
	router?.asPath?.split("/")?.[1]?.split("?")?.[0] || null;
