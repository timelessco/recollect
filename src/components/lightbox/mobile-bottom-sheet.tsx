import { useEffect, useState } from "react";

import { Drawer } from "@base-ui/react/drawer";

import type { SidepaneContentProps } from "./sidepane-content";

import { useMiscellaneousStore } from "@/store/componentStore";

import { SidepaneContent } from "./sidepane-content";

const SNAP_POINTS: Drawer.Root.Props["snapPoints"] = [0.6, 1];
const DEFAULT_SNAP_POINT = 0.6;

export function MobileBottomSheet({
  currentBookmark,
  currentIndex,
  shouldFetch,
}: SidepaneContentProps) {
  const lightboxShowSidepane = useMiscellaneousStore((state) => state.lightboxShowSidepane);
  const setLightboxShowSidepane = useMiscellaneousStore((state) => state.setLightboxShowSidepane);

  const [snapPoint, setSnapPoint] = useState<Drawer.Root.SnapPoint | null | undefined>(
    DEFAULT_SNAP_POINT,
  );

  // Reset snap point to default when navigating between slides
  useEffect(() => {
    setSnapPoint(DEFAULT_SNAP_POINT);
  }, [currentBookmark?.id]);

  const handleOpenChange: Drawer.Root.Props["onOpenChange"] = (open) => {
    setLightboxShowSidepane(open);
    try {
      localStorage.setItem("lightboxSidepaneOpen", String(open));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  return (
    <Drawer.Root
      disablePointerDismissal
      modal={false}
      onOpenChange={handleOpenChange}
      onSnapPointChange={setSnapPoint}
      open={lightboxShowSidepane}
      snapPoint={snapPoint}
      snapPoints={SNAP_POINTS}
    >
      <Drawer.Portal keepMounted>
        <Drawer.Viewport className="pointer-events-none fixed inset-0 z-10000 flex items-end">
          <Drawer.Popup className="pointer-events-auto relative flex w-full transform-[translateY(calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] touch-none flex-col overflow-visible rounded-t-xl bg-gray-0 shadow-[0_-16px_48px_rgb(0_0_0/0.12),0_6px_18px_rgb(0_0_0/0.06)] outline-hidden transition-[transform,box-shadow] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform data-ending-style:transform-[translateY(calc(100%+2px))] data-ending-style:shadow-[0_-16px_48px_rgb(0_0_0/0),0_6px_18px_rgb(0_0_0/0)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:transform-[translateY(calc(100%+2px))] data-starting-style:shadow-[0_-16px_48px_rgb(0_0_0/0),0_6px_18px_rgb(0_0_0/0)] data-swiping:select-none">
            <div className="flex shrink-0 justify-center py-3">
              <div className="h-1 w-8 rounded-full bg-gray-300" />
            </div>
            <div className="max-h-[calc(100dvh-48px)] overflow-hidden">
              <SidepaneContent
                currentBookmark={currentBookmark}
                currentIndex={currentIndex}
                shouldFetch={shouldFetch}
              />
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
