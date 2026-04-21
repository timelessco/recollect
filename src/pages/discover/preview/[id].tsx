import "yet-another-react-lightbox/styles.css";

import type { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

import { format } from "date-fns";
import ky, { HTTPError } from "ky";
import { z } from "zod";

import type { SingleListData } from "../../../types/apiTypes";

import { logger } from "@/lib/api-helpers/axiom-logger";
import { extractErrorFields } from "@/lib/api-helpers/errors";

import { CustomLightBox } from "../../../components/lightbox/LightBox";
import {
  DISCOVER_URL,
  getBaseUrl,
  NEXT_API_URL,
  V2_FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API,
} from "../../../utils/constants";

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
    const bookmark = await ky
      .get(`${getBaseUrl()}${NEXT_API_URL}/${V2_FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API}`, {
        searchParams: { id: bookmarkId },
      })
      .json<SingleListData>();

    return {
      props: {
        bookmark,
      },
      revalidate: 300,
    };
  } catch (error) {
    if (error instanceof HTTPError) {
      const { status, statusText } = error.response;

      if (status === 404) {
        console.warn(`[${ROUTE}] Bookmark not found`, {
          bookmarkId,
        });
        return { notFound: true };
      }

      console.error(`[${ROUTE}] Failed to fetch discoverable bookmark: HTTP ${status}`, {
        bookmarkId,
        status,
        statusText,
      });
      const severity = status >= 500 ? "error" : "warn";
      logger[severity]("fetch_discoverable_bookmark_failed", {
        operation: "fetch_discoverable_bookmark",
        route: ROUTE,
        context: "incremental_static_regeneration",
        bookmark_id: bookmarkId,
        "http.response.status_code": status,
        "http.response.status_text": statusText,
        error_message: `HTTP ${status}: ${statusText}`,
      });
      await logger.flush();
      return { notFound: true };
    }

    console.error(`[${ROUTE}] Unexpected error fetching discoverable bookmark`, {
      bookmarkId,
      error,
    });
    logger.error("fetch_discoverable_bookmark_error", {
      operation: "fetch_discoverable_bookmark",
      route: ROUTE,
      context: "incremental_static_regeneration",
      bookmark_id: bookmarkId,
      ...extractErrorFields(error),
    });
    await logger.flush();
    return { notFound: true };
  }
};

export default DiscoverPreview;
