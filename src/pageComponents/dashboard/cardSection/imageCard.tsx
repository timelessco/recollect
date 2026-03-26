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
// ImgLogic — entry point. Derives animation state, routes to sub-components.
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

  // Derived boolean selector — only re-renders when THIS bookmark's loading state changes
  const isLoading = useLoadersStore((s) => s.loadingBookmarkIds.has(id));
  const [errorImg, setErrorImg] = useState<null | string>(null);

  // Mark optimistic entries so we recognise them after React remounts the component
  if (isNil(id) && url) {
    recentlyAddedUrls.add(url);
  }

  // Sticky — once true, stays true for this component instance.
  // Falls back to isLoading for cases where the API normalised the URL.
  const shouldAnimateRef = useRef(recentlyAddedUrls.has(url));
  if (recentlyAddedUrls.has(url) || (isLoading && !shouldAnimateRef.current)) {
    shouldAnimateRef.current = true;
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

  // Non-animating bookmark (page-load) — render directly, zero overhead
  if (!shouldAnimateRef.current) {
    return (
      <BookmarkImage
        blurUrl={blurUrl}
        className={imgClassName}
        height={_height}
        img={img}
        isPublicPage={isPublicPage}
        onError={() => {
          setErrorImg(img);
        }}
        sizes={sizesLogic}
        width={_width}
      />
    );
  }

  // Animating bookmark — delegate to AnimatedBookmarkImage
  return (
    <AnimatedBookmarkImage
      blurUrl={blurUrl}
      cardTypeCondition={cardTypeCondition}
      className={imgClassName}
      height={_height}
      id={id}
      img={img}
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
