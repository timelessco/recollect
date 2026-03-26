/**
 * ImageCard Component
 *
 * This component handles the display of bookmark images with loading states and error handling.
 * It supports blur-up placeholders using blurhash and shows a loading animation while images load.
 */

import Image from "next/image";
import { memo, useState } from "react";

import { getImgFromArr } from "array-to-image";
import { decode } from "blurhash";
import { isEmpty, isNil } from "lodash";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/utils/tailwind-merge";

// Assets and utilities
import loaderGif from "../../../../public/loader-gif.gif";
import { useLoadersStore } from "../../../store/componentStore";
import { defaultBlur, viewValues } from "../../../utils/constants";

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
  // Bookmark URL for animation state tracking
  url: string;
}

/**
 * Main component for rendering bookmark images with loading and error states
 */
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
  const { loadingBookmarkIds, removeAnimatingBookmark } = useLoadersStore();
  const isAnimating = useLoadersStore((s) => s.animatingBookmarkUrls.has(url));
  const shouldReduceMotion = useReducedMotion();
  // Tracks which image URL failed to load
  const [errorImg, setErrorImg] = useState<null | string>(null);
  // Whether the current bookmark is being loaded
  const isLoading = loadingBookmarkIds.has(id);

  // Only render if the bookmark has a cover image
  if (hasCoverImg) {
    // Show loading placeholder if data is being fetched
    if (isLoading && isNil(id)) {
      return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />;
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

    if (img) {
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

      // Blur-up reveal for animating bookmarks
      if (isAnimating && !shouldReduceMotion) {
        return (
          <motion.div
            animate={{ filter: "blur(0px)", opacity: 1 }}
            initial={{ filter: "blur(20px)", opacity: 0 }}
            onAnimationComplete={() => {
              removeAnimatingBookmark(url);
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {imageElement}
          </motion.div>
        );
      }

      return imageElement;
    }

    return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />;
  }

  return null;
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
}: {
  // Type of the bookmark
  cardTypeCondition: number[] | string | string[] | undefined;
  // Bookmark ID
  id: number;
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
            if (isLoading) {
              return "Taking screenshot....";
            }

            return isNil(id) ? "Fetching data..." : "Cannot fetch image for this bookmark";
          })()}
        </p>
      )}
    </div>
  );
};
