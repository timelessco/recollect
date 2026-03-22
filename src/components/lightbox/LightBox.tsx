import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useMediaQuery } from "@react-hookz/web";
import { Lightbox } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import type { SingleListData } from "../../types/apiTypes";
import type { CustomSlide } from "./LightboxUtils";
import type { ZoomRef } from "yet-another-react-lightbox";

import { LightboxCloseIcon } from "../../icons/lightbox-close-icon";
import { LightboxExternalLink } from "../../icons/lightboxExternalLink";
import { ShowSidePaneButton } from "../../icons/showSidePaneButton";
import { useMiscellaneousStore } from "../../store/componentStore";
import {
  IMAGE_TYPE_PREFIX,
  PDF_MIME_TYPE,
  PDF_TYPE,
  VIDEO_TYPE_PREFIX,
} from "../../utils/constants";
import { isBookmarkAudio } from "../../utils/helpers";
import { PullEffect } from "./CloseOnSwipeDown";
import { useLightboxNavigation, useLightboxSlides } from "./hooks/useLightboxLogic";
import MetaButtonPlugin from "./LightBoxPlugin";
import {
  AudioSlide,
  ImageSlide,
  PDFSlide,
  SpotifySlide,
  VideoSlide,
  WebEmbedSlide,
  YouTubeSlide,
} from "./LightboxRenderers";
import { isSpotifyLink, isYouTubeVideo } from "./LightboxUtils";

/**
 * CustomLightBox Component
 *
 * A lightbox component that displays various types of media content
 * including images, videos, PDFs, and embedded web content. Features include:
 * - Zoom functionality for images
 * - Video playback support (including YouTube)
 * - PDF viewing with embedded viewer
 * - Side panel toggle for metadata
 * - Navigation between bookmarks
 * - URL routing integration for shareable links
 */
export const CustomLightBox = ({
  activeIndex,
  bookmarks = [],
  handleClose: originalHandleClose,
  isOpen,
  isPage,
  setActiveIndex,
}: {
  activeIndex: number;
  bookmarks?: SingleListData[];
  handleClose: () => void;
  isOpen: boolean;
  isPage?: boolean;
  setActiveIndex: (index: number) => void;
}) => {
  // Zustand store hooks for managing lightbox side panel state
  const setLightboxShowSidepane = useMiscellaneousStore((state) => state?.setLightboxShowSidepane);
  const lightboxShowSidepane = useMiscellaneousStore((state) => state?.lightboxShowSidepane);

  const zoomRef = useRef<ZoomRef>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Track bookmark IDs that have video/audio errors to render fallback image instead
  const [videoErrorIds, setVideoErrorIds] = useState<Set<number>>(() => new Set());
  const [audioErrorIds, setAudioErrorIds] = useState<Set<number>>(() => new Set());

  const handleVideoError = useCallback((bookmarkId: number) => {
    setVideoErrorIds((previous) => new Set(previous).add(bookmarkId));
  }, []);

  const handleAudioError = useCallback((bookmarkId: number) => {
    setAudioErrorIds((previous) => new Set(previous).add(bookmarkId));
  }, []);

  // Restore side panel state from local storage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedState = localStorage.getItem("lightboxSidepaneOpen");
    if (storedState !== null) {
      setLightboxShowSidepane(storedState === "true");
    }
  }, [setLightboxShowSidepane]);

  // Transform bookmarks into slides using custom hook (with embedded bookmark data)
  // Pass videoErrorIds so failed videos are treated as images for proper zoom support
  const slides = useLightboxSlides(bookmarks, videoErrorIds);

  // Handle navigation, query invalidation and URL updates using custom hook
  const { handleClose: handleCloseInvalidation, onViewRef } = useLightboxNavigation({
    activeIndex,
    bookmarks,
    isPage,
    setActiveIndex,
  });

  /**
   * Enhanced close handler that also resets the side panel state
   * and triggers query invalidation if collection changed
   * Uses useCallback to prevent unnecessary re-renders
   */
  const handleClose = useCallback(() => {
    handleCloseInvalidation();
    originalHandleClose();
    setLightboxShowSidepane(false);
  }, [handleCloseInvalidation, originalHandleClose, setLightboxShowSidepane]);

  /**
   * Custom slide renderer that handles different media types
   * Delegates rendering to specific components based on media type
   */
  const renderSlide = useCallback(
    (slideProps: { offset: number; slide: CustomSlide }) => {
      const { slide } = slideProps;

      // Find the corresponding bookmark for this slide
      const slideIndex = slides?.indexOf(slide);
      const bookmark = bookmarks?.[slideIndex];
      if (!bookmark) {
        return null;
      }

      // Determine if this slide is currently active (visible) for video player
      const isActive = slides?.indexOf(slide) === activeIndex;

      let content = null;

      // Spotify URL check — before generic audio, since Spotify URLs
      // may have audio type but need the spotify-audio element
      if (isSpotifyLink(bookmark?.url)) {
        content = <SpotifySlide bookmark={bookmark} isActive={isActive} />;
      } else if (
        isBookmarkAudio(bookmark?.type) ||
        bookmark?.meta_data?.mediaType?.startsWith("audio")
      ) {
        const hasAudioError = typeof bookmark.id === "number" && audioErrorIds.has(bookmark.id);

        content = hasAudioError ? (
          <WebEmbedSlide bookmark={bookmark} isActive={isActive} zoomRef={zoomRef} />
        ) : (
          <AudioSlide bookmark={bookmark} isActive={isActive} onAudioError={handleAudioError} />
        );
      }
      // Check video - fallback to WebEmbedSlide if video failed to load
      else if (
        bookmark?.meta_data?.mediaType?.startsWith(VIDEO_TYPE_PREFIX) ||
        bookmark?.type?.startsWith(VIDEO_TYPE_PREFIX) ||
        Boolean(bookmark?.meta_data?.video_url) ||
        Boolean(bookmark?.meta_data?.additionalVideos?.[0])
      ) {
        const hasVideoError = typeof bookmark.id === "number" && videoErrorIds.has(bookmark.id);

        // Render as image slide when video fails - this ensures proper zoom support
        content = hasVideoError ? (
          <WebEmbedSlide bookmark={bookmark} isActive={isActive} zoomRef={zoomRef} />
        ) : (
          <VideoSlide bookmark={bookmark} isActive={isActive} onVideoError={handleVideoError} />
        );
      }
      // Then check image
      else if (
        bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
        bookmark?.meta_data?.isOgImagePreferred ||
        bookmark?.type?.startsWith(IMAGE_TYPE_PREFIX)
      ) {
        content = <ImageSlide bookmark={bookmark} zoomRef={zoomRef} />;
      } else if (
        bookmark?.meta_data?.mediaType === PDF_MIME_TYPE ||
        bookmark?.type?.includes(PDF_TYPE)
      ) {
        content = <PDFSlide bookmark={bookmark} />;
      } else if (isYouTubeVideo(bookmark?.url)) {
        content = <YouTubeSlide bookmark={bookmark} isActive={isActive} />;
      } else if (bookmark?.url) {
        content = <WebEmbedSlide bookmark={bookmark} isActive={isActive} zoomRef={zoomRef} />;
      }

      return (
        <button
          className="slide-wrapper flex h-full w-full cursor-default items-center justify-center"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              handleClose();
            }
          }}
          type="button"
        >
          {content}
        </button>
      );
    },
    [
      activeIndex,
      audioErrorIds,
      bookmarks,
      handleAudioError,
      handleClose,
      handleVideoError,
      slides,
      videoErrorIds,
    ],
  );

  /**
   * Custom navigation icons
   * Left icon: Simple clickable area for previous navigation
   */
  const iconLeft = useCallback(() => <div className="h-screen w-[5vw]" />, []);

  /**
   * Right icon: Adjusts margin when side panel is open
   */
  const iconRight = useCallback(() => <div className="h-screen w-[5vw]" />, []);

  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === (bookmarks?.length ?? 0) - 1;

  const on = useMemo(
    () => ({
      view: ({ index }: { index: number }) => {
        onViewRef.current(index);
      },
      zoom: ({ zoom }: { zoom: number }) => {
        setZoomLevel(zoom);
      },
    }),
    [onViewRef],
  );

  const plugins = useMemo(() => [Zoom, MetaButtonPlugin()], []);
  const zoom = useMemo(() => ({ doubleClickDelay: 100, maxZoomPixelRatio: 100, ref: zoomRef }), []);
  const animation = useMemo(() => ({ fade: 0, zoom: 200 }), []);
  const carousel = useMemo(() => ({ finite: true, preload: 1 }), []);
  const controller = useMemo(() => ({ closeOnBackdropClick: true }), []);

  // Memoize styles configuration
  const styles = useMemo(
    () => ({
      container: {
        animation: "custom-fade-scale-in 0.25s ease-in-out",
        backdropFilter: "blur(32px)",
        backgroundColor: "var(--color-whites-900)",
        // Prevent browser navigation on swipe gestures
        overscrollBehavior: "none" as const,
        transition: "all 0.2s ease-in-out",
        // Adjust width when side panel is visible (desktop only — mobile uses bottom sheet overlay)
        width:
          !isMobile && lightboxShowSidepane ? "calc(100% - min(max(320px, 20%), 400px))" : "100%",
      },
      navigationNext: { padding: "0", top: "55.1px", transform: "none" },
      navigationPrev: { padding: "0", top: "55.1px", transform: "none" },
      slide: {
        alignItems: "center",
        display: "flex",
        height: "100%",
        justifyContent: "center",
      },
      toolbar: {
        left: "0",
        position: "absolute" as const,
        top: "0",
      },
    }),
    [isMobile, lightboxShowSidepane],
  );

  // Memoize toolbar configuration
  const toolbar = useMemo(
    () => ({
      buttons: [
        // Left: Close button
        <div className="flex items-center" key="left-section">
          <button
            aria-label="Close lightbox"
            className="group mt-1.5 ml-4 flex h-7 w-7 items-center justify-center rounded-full"
            onClick={handleClose}
            type="button"
          >
            <LightboxCloseIcon className="h-5 w-5 text-gray-alpha-600 transition-colors duration-150 hover:text-gray-alpha-800" />
          </button>
        </div>,

        // Center: Bookmark URL (flex: 1 ensures centering)
        <div className="flex flex-1 justify-center pt-[9px] text-center" key="center-section">
          <a
            className="flex max-w-[200px] items-center gap-2 overflow-hidden rounded-lg px-[13px] hover:bg-gray-alpha-100 md:max-w-[300px]"
            href={bookmarks?.[activeIndex]?.url}
            key="center-section"
            rel="noreferrer"
            target="_blank"
          >
            <span className="truncate text-[14px] leading-[115%] font-normal tracking-normal text-gray-alpha-600">
              {bookmarks?.[activeIndex]?.url?.replace(/^https?:\/\//u, "")}
            </span>
            <figure className="h-4 w-4 shrink-0 text-gray-alpha-600">
              <LightboxExternalLink />
            </figure>
          </a>
        </div>,

        // Right: Side pane toggle button
        <div
          className="group mt-[7px] mr-4 flex h-7 w-7 items-center justify-center"
          key="right-section"
        >
          <button
            aria-label={(() => {
              if (lightboxShowSidepane) {
                return isMobile ? "Hide details" : "Hide side panel";
              }

              return isMobile ? "Show details" : "Show side panel";
            })()}
            onClick={() => {
              const newState = !lightboxShowSidepane;
              setLightboxShowSidepane(newState);
              try {
                localStorage.setItem("lightboxSidepaneOpen", String(newState));
              } catch {
                // Silently fail if localStorage is unavailable
              }
            }}
            type="button"
          >
            <ShowSidePaneButton className="h-5 w-5 text-gray-alpha-600 transition-colors duration-150 group-hover:text-gray-alpha-800" />
          </button>
        </div>,
      ],
    }),
    [handleClose, bookmarks, activeIndex, isMobile, lightboxShowSidepane, setLightboxShowSidepane],
  );

  // Memoize render configuration
  const render = useMemo(
    () => ({
      buttonNext:
        (slides?.length ?? 0) <= 1 || isLastSlide || isMobile || zoomLevel !== 1
          ? () => null
          : undefined,
      buttonPrev:
        (slides?.length ?? 0) <= 1 || isFirstSlide || isMobile || zoomLevel !== 1
          ? () => null
          : undefined,
      buttonZoom: () => null,
      controls: () => (
        <PullEffect enabled={zoomLevel === 1 && !(isMobile && lightboxShowSidepane)} />
      ),
      iconNext: iconRight,
      iconPrev: iconLeft,
      slide: renderSlide,
    }),
    [
      renderSlide,
      iconRight,
      iconLeft,
      slides?.length,
      isFirstSlide,
      isMobile,
      zoomLevel,
      isLastSlide,
      lightboxShowSidepane,
    ],
  );

  return (
    <Lightbox
      // Animation configuration for lightbox transitions
      animation={animation}
      carousel={carousel}
      close={handleClose}
      controller={controller}
      index={activeIndex}
      on={on}
      open={isOpen}
      plugins={plugins}
      render={render}
      slides={slides}
      styles={styles}
      toolbar={toolbar}
      zoom={zoom}
    />
  );
};
