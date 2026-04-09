import { useMemo } from "react";

import type { SingleListData } from "@/types/apiTypes";

import PlayIcon from "@/icons/actionIcons/playIcon";
import { viewValues } from "@/utils/constants";
import { isBookmarkAudio, isBookmarkVideo } from "@/utils/helpers";
import { cn } from "@/utils/tailwind-merge";

import { ImgLogic } from "./imageCard";

export interface BookmarkOgImageProps {
  cardTypeCondition: string;
  hasCoverImg: boolean;
  img: SingleListData["ogImage"];
  isPublicPage: boolean;
  post: SingleListData;
}

export function BookmarkOgImage({
  cardTypeCondition,
  hasCoverImg,
  img,
  isPublicPage,
  post,
}: BookmarkOgImageProps) {
  const sizesLogic = useMemo(() => {
    switch (cardTypeCondition) {
      case viewValues.card: {
        return "300px";
      }
      case viewValues.list: {
        return "100px";
      }
      case viewValues.moodboard:
      case viewValues.timeline: {
        return "(max-width: 768px) 200px, 400px";
      }

      default: {
        return "500px";
      }
    }
  }, [cardTypeCondition]);

  const isVideo = isBookmarkVideo(post.type);
  const isAudio = isBookmarkAudio(post.type);

  const figureClassName = cn({
    relative: isAudio || isVideo,
    "aspect-[1.8]": cardTypeCondition === viewValues.moodboard && img === undefined,
    "mr-3 h-[48px] w-[80px]": cardTypeCondition === viewValues.list,
    "z-[-1]": (isAudio || isVideo) && cardTypeCondition !== viewValues.list,
    "w-full rounded-lg shadow-custom-8 group-hover:rounded-b-none":
      cardTypeCondition === viewValues.card || cardTypeCondition === viewValues.moodboard,
  });

  const playSvgClassName = cn({
    absolute: true,
    "bottom-[9px] left-[7px]":
      cardTypeCondition === viewValues.moodboard ||
      cardTypeCondition === viewValues.card ||
      cardTypeCondition === viewValues.timeline,
    "fill-gray-800 transition ease-in-out hover:fill-slate-500": true,
    "top-[9px] left-[21px]": cardTypeCondition === viewValues.list,
  });

  return (
    <figure className={figureClassName}>
      {isVideo && (
        <PlayIcon
          className={playSvgClassName}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        />
      )}
      <ImgLogic
        _height={post.meta_data?.height ?? 200}
        _width={post.meta_data?.width ?? 200}
        blurUrl={post.meta_data?.ogImgBlurUrl ?? ""}
        cardTypeCondition={cardTypeCondition}
        hasCoverImg={hasCoverImg ?? false}
        id={post.id}
        img={img}
        isPublicPage={isPublicPage}
        sizesLogic={sizesLogic}
        url={post.url}
      />
    </figure>
  );
}
