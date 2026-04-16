import "yet-another-react-lightbox/styles.css";

import type { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

import * as Sentry from "@sentry/nextjs";
import { format } from "date-fns";
import { z } from "zod";

import type { SingleListData } from "../../../types/apiTypes";

import { CustomLightBox } from "../../../components/lightbox/LightBox";
import {
  DISCOVER_URL,
  getBaseUrl,
  NEXT_API_URL,
  V2_FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API,
} from "../../../utils/constants";
import { HttpStatus } from "../../../utils/error-utils/common";

const DiscoverPreviewParamsSchema = z.object({
  id: z.string().regex(/^\d+$/u, "Bookmark ID must be numeric").transform(Number),
});

export interface DiscoverPreviewProps {
  bookmark: SingleListData;
}

const DiscoverPreview = (props: DiscoverPreviewProps) => {
  const { bookmark } = props;
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    void router.push(`/${DISCOVER_URL}`, undefined, { shallow: true });
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

export const getStaticProps: GetStaticProps<DiscoverPreviewProps> = async (context) => {
  const ROUTE = "/discover/preview/[id]";

  const validation = DiscoverPreviewParamsSchema.safeParse(context.params);
  if (!validation.success) {
    console.warn(`[${ROUTE}] Invalid route parameters`, {
      errors: z.treeifyError(validation.error),
    });
    return { notFound: true };
  }

  const { id: bookmarkId } = validation.data;

  try {
    const response = await fetch(
      `${getBaseUrl()}${NEXT_API_URL}/${V2_FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API}?id=${bookmarkId}`,
    );

    if (response.status === HttpStatus.NOT_FOUND) {
      console.warn(`[${ROUTE}] Bookmark not found`, {
        bookmarkId,
      });
      return { notFound: true };
    }

    if (!response.ok) {
      console.error(`[${ROUTE}] Failed to fetch discoverable bookmark: HTTP ${response.status}`, {
        bookmarkId,
        status: response.status,
        statusText: response.statusText,
      });
      Sentry.captureException(new Error(`HTTP ${response.status}: ${response.statusText}`), {
        extra: {
          bookmarkId,
          status: response.status,
          statusText: response.statusText,
        },
        tags: {
          context: "incremental_static_regeneration",
          operation: "fetch_discoverable_bookmark",
        },
      });
      return { notFound: true };
    }

    // v2 returns bare T on 200 — no { data, error } envelope unwrap
    // oxlint-disable-next-line no-unsafe-type-assertion -- response.json() types as unknown in oxlint
    const bookmark = (await response.json()) as SingleListData;

    return {
      props: {
        bookmark,
      },
      revalidate: 300,
    };
  } catch (error) {
    console.error(`[${ROUTE}] Unexpected error fetching discoverable bookmark`, {
      bookmarkId,
      error,
    });
    Sentry.captureException(error, {
      extra: { bookmarkId },
      tags: {
        context: "incremental_static_regeneration",
        operation: "fetch_discoverable_bookmark",
      },
    });
    return { notFound: true };
  }
};

export default DiscoverPreview;
