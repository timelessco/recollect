import { CATEGORY_ID_PATHNAME, PREVIEW_PATH } from "./constants";

/**
 * Public page info structure
 */
export interface PublicPageInfo {
  category_slug: string;
  user_name: string;
}

/**
 * Route push parameters for Next.js router
 */
export interface RoutePushParams {
  as: string;
  pathname: string;
  query: Record<string, number | string>;
}

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
  const { category_slug, user_name } = publicInfo;

  return {
    as: `/public/${user_name}/${category_slug}${PREVIEW_PATH}/${bookmarkId}`,
    pathname: `/public/[user_name]/[id]`,
    query: {
      bookmark_id: bookmarkId,
      id: category_slug,
      user_name,
    },
  };
};

/**
 * Builds category URL for public pages (without preview)
 * @param publicInfo - Public page info
 * @returns Next.js router push parameters
 */
export const buildPublicCategoryUrl = (publicInfo: PublicPageInfo): RoutePushParams => {
  const { category_slug, user_name } = publicInfo;

  return {
    as: `/public/${user_name}/${category_slug}`,
    pathname: `/public/[user_name]/[id]`,
    query: {
      id: category_slug,
      user_name,
    },
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
    as: `/${categorySlug}${PREVIEW_PATH}/${bookmarkId}`,
    pathname: CATEGORY_ID_PATHNAME,
    query: {
      category_id: categorySlug,
      id: bookmarkId,
    },
  };
};

/**
 * Builds category URL for authenticated pages (without preview)
 * @param categorySlug - Category slug
 * @returns Next.js router push parameters
 */
export const buildAuthenticatedCategoryUrl = (categorySlug: string): RoutePushParams => ({
  as: `/${categorySlug}`,
  pathname: CATEGORY_ID_PATHNAME,
  query: {
    category_id: categorySlug,
  },
});
