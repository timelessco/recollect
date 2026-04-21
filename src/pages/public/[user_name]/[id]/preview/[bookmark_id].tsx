import "yet-another-react-lightbox/styles.css";

import type { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

import { format } from "date-fns";
import ky, { HTTPError } from "ky";
import { z } from "zod";

import type { SingleListData } from "../../../../../types/apiTypes";

import { logger } from "@/lib/api-helpers/axiom-logger";
import { extractErrorFields } from "@/lib/api-helpers/errors";

import { CustomLightBox } from "../../../../../components/lightbox/LightBox";
import { getBaseUrl, V2_FETCH_PUBLIC_BOOKMARK_BY_ID_API } from "../../../../../utils/constants";
import { buildPublicCategoryUrl } from "../../../../../utils/url-builders";

const PublicPreviewParamsSchema = z.object({
  bookmark_id: z.string().regex(/^\d+$/u, "Bookmark ID must be numeric").transform(Number),
  id: z
    .string()
    .regex(/^[\w-]+$/u, "Invalid category slug format")
    .min(1)
    .max(100),
  user_name: z
    .string()
    .regex(/^[\w-]{1,39}$/u, "Invalid username format")
    .min(1)
    .max(39),
});

export interface PublicPreviewProps {
  bookmark: SingleListData;
}

const PublicPreview = (props: PublicPreviewProps) => {
  const { bookmark } = props;
  const router = useRouter();
  const { id: categorySlug, user_name } = router.query;

  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    if (user_name && categorySlug) {
      const { as, pathname, query } = buildPublicCategoryUrl({
        category_slug: String(categorySlug),
        user_name: String(user_name),
      });
      void router.push({ pathname, query }, as, { shallow: true });
    }
  };

  return (
    <>
      <div className="sr-only">
        <h1>{bookmark.title || "Bookmark Preview"}</h1>
        {bookmark.description && <p>{bookmark.description}</p>}
        {bookmark.meta_data?.img_caption && <p>{bookmark.meta_data.img_caption}</p>}
        {bookmark.meta_data?.ocr && <p>{bookmark.meta_data.ocr}</p>}
        {bookmark.meta_data?.mediaType && <p>{bookmark.meta_data.mediaType}</p>}
        {bookmark.meta_data?.video_url && (
          <p>
            <a href={bookmark.meta_data.video_url} rel="noopener noreferrer">
              {bookmark.meta_data.video_url}
            </a>
          </p>
        )}
        {bookmark.url && (
          <p>
            <a href={bookmark.url} rel="noopener noreferrer">
              {bookmark.url}
            </a>
          </p>
        )}
        {bookmark.inserted_at && <p>{format(new Date(bookmark.inserted_at), "MMM d, yyyy")}</p>}
      </div>
      <CustomLightBox
        activeIndex={0}
        bookmarks={[bookmark]}
        handleClose={handleClose}
        isOpen={isOpen}
        setActiveIndex={() => {
          // intentional no-op: single bookmark preview has no navigation
        }}
      />
    </>
  );
};

export const getStaticPaths: GetStaticPaths = () => ({
  fallback: "blocking",
  paths: [],
});

export const getStaticProps: GetStaticProps<PublicPreviewProps> = async (context) => {
  const ROUTE = "/public/[user_name]/[id]/preview/[bookmark_id]";

  const validation = PublicPreviewParamsSchema.safeParse(context.params);
  if (!validation.success) {
    console.warn(`[${ROUTE}] Invalid route parameters`, {
      errors: z.treeifyError(validation.error),
    });
    return { notFound: true };
  }

  const { bookmark_id, id: categorySlug, user_name } = validation.data;

  try {
    const bookmark = await ky
      .get(`${getBaseUrl()}/api/${V2_FETCH_PUBLIC_BOOKMARK_BY_ID_API}`, {
        searchParams: { bookmark_id, user_name, category_slug: categorySlug },
      })
      .json<null | SingleListData>();

    if (!bookmark) {
      console.warn(`[${ROUTE}] Bookmark data not found`, {
        bookmark_id,
        categorySlug,
        user_name,
      });
      return { notFound: true };
    }

    return {
      props: {
        bookmark,
      },
      revalidate: 1800,
    };
  } catch (error) {
    if (error instanceof HTTPError) {
      const { status, statusText } = error.response;

      if (status === 404) {
        console.warn(`[${ROUTE}] Bookmark not found`, {
          bookmark_id,
          categorySlug,
          user_name,
        });
        return { notFound: true };
      }

      console.error(`[${ROUTE}] Failed to fetch public bookmark: HTTP ${status}`, {
        bookmark_id,
        categorySlug,
        status,
        statusText,
        user_name,
      });
      const severity = status >= 500 ? "error" : "warn";
      logger[severity]("fetch_public_bookmark_failed", {
        operation: "fetch_public_bookmark",
        route: ROUTE,
        context: "incremental_static_regeneration",
        bookmark_id,
        category_slug: categorySlug,
        user_name,
        "http.response.status_code": status,
        "http.response.status_text": statusText,
        error_message: `HTTP ${status}: ${statusText}`,
      });
      await logger.flush();
      return { notFound: true };
    }

    console.error(`[${ROUTE}] Unexpected error fetching public bookmark`, {
      bookmark_id,
      categorySlug,
      error,
      user_name,
    });
    logger.error("fetch_public_bookmark_error", {
      operation: "fetch_public_bookmark",
      route: ROUTE,
      context: "incremental_static_regeneration",
      bookmark_id,
      category_slug: categorySlug,
      user_name,
      ...extractErrorFields(error),
    });
    await logger.flush();
    return { notFound: true };
  }
};

export default PublicPreview;
