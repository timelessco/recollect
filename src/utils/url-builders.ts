import { CATEGORY_ID_PATHNAME, PREVIEW_PATH } from "./constants";

/**
 * Public page info structure
 */
export type PublicPageInfo = {
	category_slug: string;
	user_name: string;
};

/**
 * Route push parameters for Next.js router
 */
export type RoutePushParams = {
	as: string;
	pathname: string;
	query: Record<string, string | number>;
};

/**
 * Builds preview URL for public pages
 * @param params - Parameters object
 * @param params.bookmarkId - The bookmark ID to preview
 * @param params.publicInfo - Public page information (user_name, category_slug)
 * @returns Next.js router push parameters
 */
export const buildPublicPreviewUrl = (params: {
	bookmarkId: number | string;
	publicInfo: PublicPageInfo;
}): RoutePushParams => {
	const { bookmarkId, publicInfo } = params;
	const { user_name, category_slug } = publicInfo;

	return {
		pathname: `/public/[user_name]/[id]`,
		query: {
			user_name,
			id: category_slug,
			bookmark_id: bookmarkId,
		},
		as: `/public/${user_name}/${category_slug}${PREVIEW_PATH}/${bookmarkId}`,
	};
};

/**
 * Builds category URL for public pages (without preview)
 * @param publicInfo - Public page info
 * @returns Next.js router push parameters
 */
export const buildPublicCategoryUrl = (
	publicInfo: PublicPageInfo,
): RoutePushParams => {
	const { user_name, category_slug } = publicInfo;

	return {
		pathname: `/public/[user_name]/[id]`,
		query: {
			user_name,
			id: category_slug,
		},
		as: `/public/${user_name}/${category_slug}`,
	};
};

/**
 * Builds preview URL for authenticated pages
 * @param params - Parameters object
 * @param params.bookmarkId - The bookmark ID to preview
 * @param params.categorySlug - The category slug
 * @returns Next.js router push parameters
 */
export const buildAuthenticatedPreviewUrl = (params: {
	bookmarkId: number | string;
	categorySlug: string;
}): RoutePushParams => {
	const { bookmarkId, categorySlug } = params;

	return {
		pathname: `${CATEGORY_ID_PATHNAME}`,
		query: {
			category_id: categorySlug,
			id: bookmarkId,
		},
		as: `/${categorySlug}${PREVIEW_PATH}/${bookmarkId}`,
	};
};

/**
 * Builds category URL for authenticated pages (without preview)
 * @param categorySlug - Category slug
 * @returns Next.js router push parameters
 */
export const buildAuthenticatedCategoryUrl = (
	categorySlug: string,
): RoutePushParams => ({
	pathname: `${CATEGORY_ID_PATHNAME}`,
	query: {
		category_id: categorySlug,
	},
	as: `/${categorySlug}`,
});
