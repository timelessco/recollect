import "yet-another-react-lightbox/styles.css";

import type { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

import * as Sentry from "@sentry/nextjs";
import { format } from "date-fns";
import { z } from "zod";

import type { SingleListData } from "../../../../../types/apiTypes";

import { CustomLightBox } from "../../../../../components/lightbox/LightBox";
import { getBaseUrl, V2_FETCH_PUBLIC_BOOKMARK_BY_ID_API } from "../../../../../utils/constants";
import { HttpStatus } from "../../../../../utils/error-utils/common";
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
    const response = await fetch(
      `${getBaseUrl()}/api/${V2_FETCH_PUBLIC_BOOKMARK_BY_ID_API}?bookmark_id=${bookmark_id}&user_name=${user_name}&category_slug=${categorySlug}`,
    );

    if (response.status === HttpStatus.NOT_FOUND) {
      console.warn(`[${ROUTE}] Bookmark not found`, {
        bookmark_id,
        categorySlug,
        user_name,
      });
      return { notFound: true };
    }

    if (!response.ok) {
      console.error(`[${ROUTE}] Failed to fetch public bookmark: HTTP ${response.status}`, {
        bookmark_id,
        categorySlug,
        status: response.status,
        statusText: response.statusText,
        user_name,
      });
      Sentry.captureException(new Error(`HTTP ${response.status}: ${response.statusText}`), {
        extra: {
          bookmark_id,
          categorySlug,
          status: response.status,
          statusText: response.statusText,
          user_name,
        },
        tags: {
          context: "incremental_static_regeneration",
          operation: "fetch_public_bookmark",
        },
      });
      return { notFound: true };
    }

    // v2 returns the bookmark row directly; errors surface via non-2xx HTTP status above.
    // oxlint-disable-next-line no-unsafe-type-assertion -- response.json() types as unknown in oxlint
    const bookmark = (await response.json()) as null | SingleListData;

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
    console.error(`[${ROUTE}] Unexpected error fetching public bookmark`, {
      bookmark_id,
      categorySlug,
      error,
      user_name,
    });
    Sentry.captureException(error, {
      extra: { bookmark_id, categorySlug, user_name },
      tags: {
        context: "incremental_static_regeneration",
        operation: "fetch_public_bookmark",
      },
    });
    return { notFound: true };
  }
};

export default PublicPreview;
