import { useRouter } from "next/router";

import { useMediaQuery } from "@react-hookz/web";
import { createModule, useLightboxState } from "yet-another-react-lightbox";

import type { CustomSlide } from "./LightboxUtils";
import type { Plugin, Slide } from "yet-another-react-lightbox";

import { useFetchBookmarkById } from "../../async/queryHooks/bookmarks/use-fetch-bookmark-by-id";
import { Spinner } from "../spinner";
import { DesktopSidepane } from "./desktop-sidepane";
import { MobileBottomSheet } from "./mobile-bottom-sheet";

function isCustomSlide(slide: Slide): slide is CustomSlide {
  return "data" in slide;
}

const MyComponent = () => {
  const { currentIndex, slides } = useLightboxState();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const router = useRouter();

  const rawSlide = slides[currentIndex];
  const currentSlide = rawSlide && isCustomSlide(rawSlide) ? rawSlide : undefined;
  let currentBookmark = currentSlide?.data?.bookmark;

  const { id } = router.query;
  const shouldFetch = !currentBookmark && typeof id === "string" && id.length > 0;

  const { data: bookmark } = useFetchBookmarkById(typeof id === "string" ? id : "", {
    enabled: shouldFetch,
  });

  if (!currentBookmark && bookmark?.[0]) {
    [currentBookmark] = bookmark;
  }

  if (!currentBookmark) {
    if (isMobile) {
      return null;
    }

    return (
      <div className="absolute top-0 right-0 flex h-full w-1/5 max-w-[400px] min-w-[320px] flex-col items-center justify-center border-l-[0.5px] border-gray-100 bg-gray-0 backdrop-blur-[41px]">
        <Spinner className="h-3 w-3 animate-spin" style={{ color: "var(--color-plain-reverse)" }} />
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileBottomSheet
        currentBookmark={currentBookmark}
        currentIndex={currentIndex}
        shouldFetch={shouldFetch}
      />
    );
  }

  return (
    <DesktopSidepane
      currentBookmark={currentBookmark}
      currentIndex={currentIndex}
      shouldFetch={shouldFetch}
    />
  );
};

const myModule = createModule("MyModule", MyComponent);

export default function MetaButtonPlugin(): Plugin {
  return ({ addSibling }) => {
    addSibling("controller", myModule, false);
  };
}
