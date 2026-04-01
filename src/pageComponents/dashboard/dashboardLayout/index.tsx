import { useRef, useState } from "react";

import { Drawer } from "@base-ui/react/drawer";
import { useQueryClient } from "@tanstack/react-query";
import { Allotment } from "allotment";
import find from "lodash/find";

import type { BookmarksCountTypes, CategoriesData } from "../../../types/apiTypes";
import type { AllotmentHandle } from "allotment";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { useSupabaseSession } from "../../../store/componentStore";
import { useSidePaneStore } from "../../../store/sidePaneStore";
import { optionsMenuListArray } from "../../../utils/commonData";
import { BOOKMARKS_COUNT_KEY, CATEGORIES_KEY } from "../../../utils/constants";
import { SettingsModalPortal } from "../modals/settings-modal";
import SidePane from "../sidePane";
import {
  AllotmentWrapper,
  SIDE_PANE_ANIMATION_DELAY,
  SIDE_PANE_DEFAULT_WIDTH,
} from "./allotmentWrapper";
import { DashboardContent } from "./dashboardContent";
import { HeaderOptionsPopover } from "./header-options-popover";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = (props: DashboardLayoutProps) => {
  const { children } = props;

  const session = useSupabaseSession((state) => state.session);
  const userId = session?.user?.id ?? "";
  const { category_id: categoryId } = useGetCurrentCategoryId();

  const [showSearchBar, setShowSearchBar] = useState(true);

  const allotmentRef = useRef<AllotmentHandle>(null);
  const sidePaneRef = useRef<HTMLDivElement>(null);
  const sidePaneContentRef = useRef<HTMLDivElement>(null);

  const showSidePane = useSidePaneStore((state) => state.showSidePane);
  const setShowSidePane = useSidePaneStore((state) => state.setShowSidePane);

  const { isDesktop } = useIsMobileView();

  const [prevIsDesktop, setPrevIsDesktop] = useState(isDesktop);
  if (prevIsDesktop !== isDesktop) {
    setPrevIsDesktop(isDesktop);
    setShowSearchBar(isDesktop);
  }

  const queryClient = useQueryClient();

  const currentPath = useGetCurrentUrlPath();

  const categoryData = queryClient.getQueryData<{ data: CategoriesData[] }>([
    CATEGORIES_KEY,
    userId,
  ]);

  const bookmarksCountData = queryClient.getQueryData<BookmarksCountTypes>([
    BOOKMARKS_COUNT_KEY,
    userId,
  ]);

  const optionsMenuList = optionsMenuListArray(currentPath, bookmarksCountData);

  const currentCategoryData = find(
    categoryData?.data,
    (item) => item?.category_slug === currentPath,
  );
  const headerName =
    currentCategoryData?.category_name ?? find(optionsMenuList, (item) => item?.current)?.name;

  const dashboardContentElement = () => {
    const onExpandSidePane = () => {
      if (isDesktop) {
        setShowSidePane(true);
        setTimeout(() => allotmentRef.current?.reset(), SIDE_PANE_ANIMATION_DELAY);
      } else {
        setShowSidePane(true);
      }
    };

    return (
      <DashboardContent
        categoryId={categoryId}
        currentCategoryData={currentCategoryData}
        currentPath={currentPath}
        headerName={headerName}
        headerOptions={<HeaderOptionsPopover />}
        isDesktop={isDesktop}
        onExpandSidePane={onExpandSidePane}
        onShowSearchBar={setShowSearchBar}
        optionsMenuList={optionsMenuList}
        showSearchBar={showSearchBar}
        showSidePane={showSidePane}
      >
        {children}
      </DashboardContent>
    );
  };

  if (isDesktop) {
    return (
      <>
        <div className="h-screen w-screen">
          <AllotmentWrapper
            allotmentRef={allotmentRef}
            className="split-view-container"
            separator={false}
            sidePaneContentRef={sidePaneContentRef}
            sidePaneRef={sidePaneRef}
          >
            <Allotment.Pane
              className="split-left-pane"
              maxSize={350}
              minSize={0}
              preferredSize={SIDE_PANE_DEFAULT_WIDTH}
              ref={sidePaneRef}
              snap
              visible={showSidePane}
            >
              <div className="h-full min-w-[200px]" ref={sidePaneContentRef}>
                <SidePane />
              </div>
            </Allotment.Pane>
            <Allotment.Pane className="split-right-pane">
              {dashboardContentElement()}
            </Allotment.Pane>
          </AllotmentWrapper>
        </div>
        <SettingsModalPortal />
      </>
    );
  }

  return (
    <>
      <div className="flex">
        <Drawer.Root
          modal
          onOpenChange={(open) => {
            setShowSidePane(open);
          }}
          open={showSidePane}
          swipeDirection="left"
        >
          <Drawer.Portal keepMounted>
            <Drawer.Backdrop className="fixed inset-0 z-50 bg-black opacity-[calc(0.2*(1-var(--drawer-swipe-progress)))] transition-opacity duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0" />
            <Drawer.Viewport className="fixed inset-0 z-50 flex">
              <Drawer.Popup className="h-full w-[250px] transform-[translateX(var(--drawer-swipe-movement-x))] touch-pan-y bg-white shadow-[0_0_10px_5px_rgb(0_0_0/10%)] outline-hidden transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:transform-[translateX(-100%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:transform-[translateX(-100%)] data-swiping:duration-0 data-swiping:select-none">
                <SidePane />
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>

        {dashboardContentElement()}

        {/* Portal container so side-pane dropdowns render above the Drawer on small screens */}
        <div className="pointer-events-none fixed inset-0 z-9999" id="side-pane-dropdown-portal" />
      </div>
      <SettingsModalPortal />
    </>
  );
};

export default DashboardLayout;
