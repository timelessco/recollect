import { CATEGORY_ID_PATHNAME, DISCOVER_URL, PREVIEW_PATH } from "./constants";

const PUBLIC_DISCOVER_PATHNAME = `/public/${DISCOVER_URL}`;

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

/**
 * Builds preview URL for the guest /public/discover page.
 *
 * `pathname` stays on /public/discover so the router.push can be shallow on the
 * guest grid; the address bar shows /public/discover/preview/[id], which is
 * served by src/pages/public/discover/preview/[id].tsx on reload.
 */
export const buildPublicDiscoverPreviewUrl = (params: {
  bookmarkId: number | string;
}): RoutePushParams => ({
  as: `${PUBLIC_DISCOVER_PATHNAME}${PREVIEW_PATH}/${params.bookmarkId}`,
  pathname: PUBLIC_DISCOVER_PATHNAME,
  query: {
    id: params.bookmarkId,
  },
});

/**
 * Builds category URL for the guest /public/discover page (without preview)
 */
export const buildPublicDiscoverUrl = (): RoutePushParams => ({
  as: PUBLIC_DISCOVER_PATHNAME,
  pathname: PUBLIC_DISCOVER_PATHNAME,
  query: {},
});

/**
 * Builds preview URL for similar pages — `/similar/<sourceId>/preview/<bookmarkId>`.
 * Keeps the parent `/similar/[id]` pathname so in-app `shallow: true` pushes stay on
 * the grid page; deep links land on the preview page file directly via `as`.
 */
export const buildSimilarPreviewUrl = (params: {
  bookmarkId: number | string;
  sourceId: number | string;
}): RoutePushParams => {
  const { bookmarkId, sourceId } = params;
  return {
    as: `/similar/${sourceId}${PREVIEW_PATH}/${bookmarkId}`,
    pathname: `/similar/[id]`,
    query: { bookmark_id: bookmarkId, id: sourceId },
  };
};

/**
 * Builds base similar URL — `/similar/<sourceId>` — used when closing the lightbox
 * overlay back to the similar-bookmarks grid.
 */
export const buildSimilarUrl = (sourceId: number | string): RoutePushParams => ({
  as: `/similar/${sourceId}`,
  pathname: `/similar/[id]`,
  query: { id: sourceId },
});
