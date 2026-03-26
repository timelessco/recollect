/**
 * AnimatedBookmarkImage + BookmarkImage + LoaderImgPlaceholder
 *
 * BookmarkImage: pure render of Next.js Image with blurhash decode (no hooks).
 * AnimatedBookmarkImage: preloads images then crossfades them in.
 *   Only mounted for recently added bookmarks — page-load bookmarks never use this.
 * LoaderImgPlaceholder: loading/error state placeholder with status text.
 */

import Image from "next/image";
import { useEffect, useState } from "react";

import { getImgFromArr } from "array-to-image";
import { decode } from "blurhash";
import { isEmpty, isNil } from "lodash";
import { motion } from "motion/react";

import { cn } from "@/utils/tailwind-merge";

import loaderGif from "../../../../public/loader-gif.gif";
import { useLoadersStore } from "../../../store/componentStore";
import { defaultBlur, viewValues } from "../../../utils/constants";

/**
 * Tracks bookmark URLs seen in optimistic (no-id) state.
 * Survives React list key remounts (undefined → real ID).
 * Page-load bookmarks never enter this set.
 */
export const recentlyAddedUrls = new Set<string>();

// ---------------------------------------------------------------------------
// BookmarkImage — pure component, no hooks. Renders <Image> with blurhash.
// ---------------------------------------------------------------------------

export interface BookmarkImageProps {
  blurUrl: null | string;
  className: string;
  height: number;
  img: string;
  isPublicPage: boolean;
  onError?: () => void;
  sizes: string;
  width: number;
}

export function BookmarkImage({
  blurUrl,
  className,
  height,
  img,
  isPublicPage,
  onError,
  sizes,
  width,
}: BookmarkImageProps) {
  let blurSource = "";
  if (!isNil(blurUrl) && !isEmpty(blurUrl) && !isPublicPage) {
    const pixels = decode(blurUrl, 32, 32);
    const image = getImgFromArr(pixels, 32, 32);
    blurSource = image.src;
  }

  return (
    <Image
      alt="bookmark-img"
      blurDataURL={blurSource || defaultBlur}
      className={className}
      height={height}
      key={img}
      onError={onError}
      placeholder="blur"
      sizes={sizes}
      src={img}
      width={width}
    />
  );
}

// ---------------------------------------------------------------------------
// AnimatedBookmarkImage — isolates preload state + effect.
// Only mounted for recently added bookmarks.
// ---------------------------------------------------------------------------

export interface AnimatedBookmarkImageProps {
  blurUrl: null | string;
  cardTypeCondition: number[] | string | string[] | undefined;
  className: string;
  height: number;
  id: number;
  img: string;
  isPublicPage: boolean;
  onError: () => void;
  sizes: string;
  width: number;
}

export function AnimatedBookmarkImage({
  blurUrl,
  cardTypeCondition,
  className,
  height,
  id,
  img,
  isPublicPage,
  onError,
  sizes,
  width,
}: AnimatedBookmarkImageProps) {
  // The image URL confirmed loaded by the browser
  const [displaySrc, setDisplaySrc] = useState<null | string>(null);

  // Preload images so we can show them without layout flash.
  // displaySrc is intentionally omitted from deps — including it causes a
  // wasted cleanup+setup cycle when the effect itself updates displaySrc.
  useEffect(() => {
    if (!img) {
      return;
    }
    const preload = new window.Image();
    const onReady = () => {
      setDisplaySrc(img);
    };
    preload.addEventListener("load", onReady);
    preload.addEventListener("error", onReady);
    preload.src = img;
    return () => {
      preload.removeEventListener("load", onReady);
      preload.removeEventListener("error", onReady);
    };
  }, [img]);

  const imageProps = { blurUrl, className, height, isPublicPage, sizes, width } as const;

  // Still preloading — show previous image or placeholder
  if (displaySrc !== img) {
    if (displaySrc) {
      return <BookmarkImage {...imageProps} img={displaySrc} />;
    }
    return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />;
  }

  // Preloaded — fade in. key={displaySrc} replays animation per new image.
  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      key={displaySrc}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <BookmarkImage {...imageProps} img={img} onError={onError} />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// LoaderImgPlaceholder — loading/error state placeholder (same as dev)
// ---------------------------------------------------------------------------

export const LoaderImgPlaceholder = ({
  cardTypeCondition,
  id,
}: {
  cardTypeCondition: number[] | string | string[] | undefined;
  id: number;
}) => {
  const isLoading = useLoadersStore((s) => s.loadingBookmarkIds.has(id));

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
