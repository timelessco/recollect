/**
 * ImageCard Component
 *
 * Handles bookmark image display with loading states, error handling,
 * and smooth transitions for newly added bookmarks.
 */

import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";

import { getImgFromArr } from "array-to-image";
import { decode } from "blurhash";
import { isEmpty, isNil } from "lodash";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/utils/tailwind-merge";

import loaderGif from "../../../../public/loader-gif.gif";
import { useLoadersStore } from "../../../store/componentStore";
import { defaultBlur, viewValues } from "../../../utils/constants";

/**
 * Tracks bookmark URLs seen in optimistic (no-id) state.
 * Survives React list key remounts (undefined → real ID).
 * Page-load bookmarks never enter this set.
 */
const recentlyAddedUrls = new Set<string>();

/**
 * Props for the ImgLogicComponent
 */
interface ImgLogicProps {
  // Image dimensions
  _height: number;
  _width: number;
  // Blurhash URL for progressive image loading
  blurUrl: null | string;
  // Type of the bookmark
  cardTypeCondition: number[] | string | string[] | undefined;
  // Whether to show the cover image
  hasCoverImg: boolean;
  // Unique identifier for the bookmark
  id: number;
  // Source URL of the image
  img: string;
  // Whether the component is rendered on a public page
  isPublicPage: boolean;
  // Sizes attribute for responsive images
  sizesLogic: string;
  // Bookmark URL — used for animation state tracking across remounts
  url: string;
}

const ImgLogicComponent = ({
  _height,
  _width,
  blurUrl,
  cardTypeCondition,
  hasCoverImg,
  id,
  img,
  isPublicPage,
  sizesLogic,
  url,
}: ImgLogicProps) => {
  // image class name for all views
  const imgClassName = cn({
    "max-h-[48px] min-h-[48px] max-w-[80px] min-w-[80px] rounded-sm object-cover":
      cardTypeCondition === viewValues.list,
    "moodboard-card-img aspect-[1.9047] w-full rounded-lg object-cover duration-150 group-hover:rounded-b-none":
      cardTypeCondition === viewValues.card,
    "moodboard-card-img max-h-[900px] min-h-[192px] w-full rounded-lg object-cover duration-150 group-hover:rounded-b-none":
      cardTypeCondition === viewValues.moodboard || cardTypeCondition === viewValues.timeline,
    "relative z-[-1]":
      cardTypeCondition === viewValues.card || cardTypeCondition === viewValues.moodboard,
  });

  // State and store
  const { loadingBookmarkIds } = useLoadersStore();
  // Tracks which image URL failed to load
  const [errorImg, setErrorImg] = useState<null | string>(null);
  // Whether the current bookmark is being loaded
  const isLoading = loadingBookmarkIds.has(id);

  // --- Animation tracking ---
  // Mark optimistic entries so we can animate after remount
  if (isNil(id) && url) {
    recentlyAddedUrls.add(url);
  }

  // Sticky flag — once true, stays true for this component's lifetime.
  // Uses URL match OR isLoading as signals. isLoading catches cases where
  // the API normalizes the URL (e.g. adds https://) breaking the Set match.
  const shouldAnimateRef = useRef(recentlyAddedUrls.has(url));
  if (recentlyAddedUrls.has(url) || (isLoading && !shouldAnimateRef.current)) {
    shouldAnimateRef.current = true;
  }

  // Track if isLoading was ever true — once a bookmark enters loading state,
  // we know it's being processed. Prevents "Cannot fetch image" flash in the
  // gap after isLoading goes false but before the new img arrives via refetch.
  const wasEverLoadingRef = useRef(isLoading);
  if (isLoading) {
    wasEverLoadingRef.current = true;
  }

  const shouldAnimate = shouldAnimateRef.current;
  const isProcessing = shouldAnimate || isLoading || wasEverLoadingRef.current;

  // The img URL confirmed loaded by the browser (only tracked for animating bookmarks)
  const [readyImg, setReadyImg] = useState<null | string>(null);

  // Preload images in the background using a native <img> so the Next.js Image
  // only renders once the data is available — prevents layout flash from
  // default 200x200 dimensions before actual image dimensions are known.
  useEffect(() => {
    if (!shouldAnimate || !img || readyImg === img) {
      return;
    }

    const preload = new window.Image();
    const handler = () => {
      setReadyImg(img);
    };
    preload.addEventListener("load", handler);
    preload.addEventListener("error", handler);
    preload.src = img;

    return () => {
      preload.removeEventListener("load", handler);
      preload.removeEventListener("error", handler);
    };
  }, [shouldAnimate, img, readyImg]);

  useEffect(() => {
    if (readyImg && recentlyAddedUrls.has(url)) {
      recentlyAddedUrls.delete(url);
    }
  }, [readyImg, url]);

  // --- Rendering ---

  // Only render if the bookmark has a cover image
  if (!hasCoverImg) {
    return null;
  }

  // Show error placeholder if image failed to load
  if (errorImg === img) {
    return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />;
  }

  // Generate blur placeholder if blurhash is available
  let blurSource = "";
  if (!isNil(img) && !isNil(blurUrl) && !isEmpty(blurUrl) && !isPublicPage) {
    // Decode blurhash to create a blurry placeholder
    const pixels = decode(blurUrl, 32, 32);
    const image = getImgFromArr(pixels, 32, 32);
    blurSource = image.src;
  }

  // No image yet — show placeholder with appropriate text
  if (!img) {
    return (
      <LoaderImgPlaceholder
        cardTypeCondition={cardTypeCondition}
        id={id}
        isProcessing={isProcessing}
      />
    );
  }

  const imageElement = (
    <Image
      alt="bookmark-img"
      blurDataURL={blurSource || defaultBlur}
      className={imgClassName}
      height={_height}
      key={img}
      onError={() => {
        setErrorImg(img);
      }}
      placeholder="blur"
      sizes={sizesLogic}
      src={img}
      width={_width}
    />
  );

  // Non-animating bookmark — render directly, zero overhead
  if (!shouldAnimate) {
    return imageElement;
  }

  // --- Animating bookmark ---
  const imgIsReady = readyImg === img;

  if (!imgIsReady) {
    if (readyImg) {
      return (
        <Image
          alt="bookmark-img"
          blurDataURL={blurSource || defaultBlur}
          className={imgClassName}
          height={_height}
          placeholder="blur"
          sizes={sizesLogic}
          src={readyImg}
          width={_width}
        />
      );
    }

    return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} isProcessing />;
  }

  // Image preloaded — render with crossfade animation
  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        key={readyImg}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {imageElement}
      </motion.div>
    </AnimatePresence>
  );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render when relevant props change
export const ImgLogic = memo(
  ImgLogicComponent,
  (previousProps, nextProps) =>
    previousProps.id === nextProps.id &&
    previousProps.hasCoverImg === nextProps.hasCoverImg &&
    previousProps.img === nextProps.img &&
    previousProps.blurUrl === nextProps.blurUrl &&
    previousProps._height === nextProps._height &&
    previousProps._width === nextProps._width &&
    previousProps.sizesLogic === nextProps.sizesLogic &&
    previousProps.isPublicPage === nextProps.isPublicPage &&
    previousProps.url === nextProps.url,
);

/**
 * Loading and error state placeholder component
 */
const LoaderImgPlaceholder = ({
  cardTypeCondition,
  id,
  isProcessing = false,
}: {
  // Type of the bookmark
  cardTypeCondition: number[] | string | string[] | undefined;
  // Bookmark ID
  id: number;
  // Whether the bookmark is being processed (recently added)
  isProcessing?: boolean;
}) => {
  const { loadingBookmarkIds } = useLoadersStore();
  const isLoading = loadingBookmarkIds.has(id);
  // loader class name for all views
  const loaderClassName = cn({
    "flex aspect-[1.8] w-full flex-col items-center justify-center gap-2 rounded-lg bg-gray-100 text-center duration-150 group-hover:rounded-b-none":
      cardTypeCondition === viewValues.moodboard,
    "flex aspect-[1.9047] w-full flex-col items-center justify-center gap-2 rounded-lg bg-gray-100 text-center duration-150 group-hover:rounded-b-none":
      cardTypeCondition === viewValues.card || cardTypeCondition === viewValues.timeline,
    "flex h-[48px] w-[80px] items-center justify-center rounded-lg bg-gray-100":
      cardTypeCondition === viewValues.list,
  });
  return (
    <div className={loaderClassName}>
      <Image
        alt="loading"
        className="h-[50px] w-[50px] rounded-lg object-cover dark:brightness-0 dark:invert"
        loader={(source) => source.src}
        src={loaderGif}
      />
      {!(cardTypeCondition === viewValues.list) && (
        <p className="text-sm text-gray-900">
          {(() => {
            if (isNil(id) || isProcessing) {
              return "Fetching data...";
            }

            if (isLoading) {
              return "Taking screenshot....";
            }

            return "Cannot fetch image for this bookmark";
          })()}
        </p>
      )}
    </div>
  );
};
