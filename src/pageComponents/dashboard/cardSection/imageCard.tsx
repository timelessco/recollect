/**
 * ImageCard Component
 *
 * Entry point for bookmark image display. Routes to:
 * - BookmarkImage (page-load bookmarks — zero animation overhead)
 * - AnimatedBookmarkImage (newly added bookmarks — preload + crossfade)
 * - LoaderImgPlaceholder (loading/error states)
 */

import { memo, useRef, useState } from "react";

import { isNil } from "lodash";

import type { BookmarkImageProps } from "./animatedBookmarkImage";

import { cn } from "@/utils/tailwind-merge";

import { useLoadersStore } from "../../../store/componentStore";
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

  const isLoading = useLoadersStore((s) => s.loadingBookmarkIds.has(id));
  const [errorImg, setErrorImg] = useState<null | string>(null);

  // Mark optimistic entries so we recognize them after React remounts the component.
  // Guard with hasCoverImg so every add has a corresponding delete path downstream.
  if (isNil(id) && url && hasCoverImg) {
    recentlyAddedUrls.add(url);
  }

  if (!hasCoverImg) {
    return null;
  }

  // Show loading placeholder if data is being fetched
  if (isLoading && isNil(id)) {
    return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />;
  }

  // Show error placeholder if image failed to load
  if (errorImg === img) {
    return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />;
  }

  if (!img) {
    return <LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />;
  }

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
  // Reads from recentlyAddedUrls (set by optimistic render) then deletes
  // immediately — the Set is a one-shot bridge, the ref is per-component truth.
  // Falls back to isLoading for cases where the API normalised the URL.
  const shouldAnimateRef = useRef(recentlyAddedUrls.has(url));
  if (recentlyAddedUrls.has(url)) {
    shouldAnimateRef.current = true;
    recentlyAddedUrls.delete(url);
  }
  if (isLoading && !shouldAnimateRef.current) {
    shouldAnimateRef.current = true;
  }

  if (!shouldAnimateRef.current) {
    return <BookmarkImage {...imageProps} onError={onError} />;
  }

  return (
    <AnimatedBookmarkImage
      {...imageProps}
      cardTypeCondition={cardTypeCondition}
      id={id}
      onError={onError}
    />
  );
}
