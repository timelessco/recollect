/**
 * ImageCard Component
 *
 * Entry point for bookmark image display. Routes to:
 * - BookmarkImage (page-load bookmarks — zero animation overhead)
 * - AnimatedBookmarkImage (newly added bookmarks — preload + crossfade)
 * - LoaderImgPlaceholder (loading/error states)
 */

import { memo, useRef, useState } from "react";

import type { BookmarkImageProps } from "./animatedBookmarkImage";

import { cn } from "@/utils/tailwind-merge";

import { useBookmarkEnrichmentActive } from "../../../hooks/use-bookmark-enrichment-active";
import { viewValues } from "../../../utils/constants";
import {
  AnimatedBookmarkImage,
  BookmarkImage,
  LoaderImgPlaceholder,
  recentlyAddedUrls,
} from "./animatedBookmarkImage";

// ---------------------------------------------------------------------------
// ImgLogic — entry point. Handles hasCoverImg, error, and !img checks.
// ---------------------------------------------------------------------------

interface ImgLogicProps {
  _height: number;
  _width: number;
  blurUrl: null | string;
  cardTypeCondition: number[] | string | string[] | undefined;
  hasCoverImg: boolean;
  id: number;
  img: string;
  isPublicPage: boolean;
  sizesLogic: string;
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

  const isLoading = useBookmarkEnrichmentActive(id);
  const [errorImg, setErrorImg] = useState<null | string>(null);

  if (!hasCoverImg) {
    return null;
  }

  // Show error placeholder if image failed to load
  if (img && errorImg === img) {
    return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />;
  }

  // Always route through BookmarkImageWithAnimation so the same component
  // instance manages the entire optimistic → real-data → image lifecycle.
  // AnimatedBookmarkImage handles !img internally (shows loader).
  return (
    <BookmarkImageWithAnimation
      blurUrl={blurUrl}
      cardTypeCondition={cardTypeCondition}
      className={imgClassName}
      height={_height}
      id={id}
      img={img}
      isLoading={isLoading}
      isPublicPage={isPublicPage}
      onError={() => {
        setErrorImg(img);
      }}
      sizes={sizesLogic}
      url={url}
      width={_width}
    />
  );
};

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

// ---------------------------------------------------------------------------
// BookmarkImageWithAnimation — isolates the shouldAnimate ref.
// Renders BookmarkImage directly or delegates to AnimatedBookmarkImage.
// ---------------------------------------------------------------------------

function BookmarkImageWithAnimation({
  cardTypeCondition,
  id,
  img,
  isLoading,
  onError,
  url,
  ...imageProps
}: Omit<BookmarkImageProps, "onError"> & {
  cardTypeCondition: number[] | string | string[] | undefined;
  id: number;
  isLoading: boolean;
  onError: () => void;
  url: string;
}) {
  // Sticky — once true, stays true for this component instance.
  // null = not yet checked. Checked once on mount via ??= to prevent existing
  // bookmarks with the same URL from animating on re-render.
  const shouldAnimateRef = useRef<boolean | null>(null);
  shouldAnimateRef.current ??= recentlyAddedUrls.delete(url);
  // Fallback for cases where the API normalised the URL (loading starts after mount)
  if (isLoading && !shouldAnimateRef.current) {
    shouldAnimateRef.current = true;
  }

  if (shouldAnimateRef.current) {
    // AnimatedBookmarkImage handles all states: !img (loader), preloading, ready (fade-in).
    // Mounting it early keeps the same component instance across the optimistic→real transition.
    return (
      <AnimatedBookmarkImage
        {...imageProps}
        cardTypeCondition={cardTypeCondition}
        id={id}
        img={img}
        onError={onError}
      />
    );
  }

  // Non-animated path (page-load bookmarks)
  if (!img) {
    return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />;
  }
  return <BookmarkImage {...imageProps} img={img} onError={onError} />;
}
