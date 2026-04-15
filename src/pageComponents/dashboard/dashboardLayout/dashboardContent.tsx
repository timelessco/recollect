import type { CategoriesData } from "../../../types/apiTypes";
import type { CategoryIdUrlTypes } from "../../../types/componentTypes";

import { cn } from "@/utils/tailwind-merge";

import AddBookmarkDropdown from "../../../components/customDropdowns.tsx/addBookmarkDropdown";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { DISCOVER_URL, TRASH_URL } from "../../../utils/constants";
import { NavBarLogo, SidePaneCollapseButton } from "./components";
import { NavBarHeading } from "./headingComponents";
import { SearchBar } from "./searchComponents";

interface DashboardContentProps {
  categoryId: CategoryIdUrlTypes;
  children: React.ReactNode;
  currentCategoryData?: CategoriesData;
  currentPath: null | string;
  headerName?: null | string;
  headerOptions: React.ReactNode;
  isDesktop: boolean;
  onExpandSidePane: () => void;
  onShowSearchBar: (value: boolean) => void;
  optionsMenuList: { current?: boolean; icon?: React.ReactNode }[];
  showSearchBar: boolean;
  showSidePane: boolean;
}

export const DashboardContent = (props: DashboardContentProps) => {
  const {
    categoryId,
    children,
    currentCategoryData,
    currentPath,
    headerName,
    headerOptions,
    isDesktop,
    onExpandSidePane,
    onShowSearchBar,
    optionsMenuList,
    showSearchBar,
    showSidePane,
  } = props;

  const triggerHeadingEdit = useMiscellaneousStore((state) => state.triggerHeadingEdit);

  return (
    <div className="relative w-full">
      <header className="absolute top-0 z-5 flex w-full items-center justify-between bg-[rgb(255_255_255/90%)] py-[6.5px] pr-3 pl-[13px] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.06)] backdrop-blur-[20.5px] dark:bg-[rgb(16_16_16/90%)]">
        <div
          className={cn(
            "flex items-center py-[3px] pl-[9px]",
            (isDesktop || !showSearchBar) && "w-1/5 max-lg:w-3/4",
          )}
        >
          <SidePaneCollapseButton onToggle={onExpandSidePane} showSidePane={showSidePane} />
          {(isDesktop || !showSearchBar) && (
            <>
              <figure className="mr-2 flex max-h-[20px] min-h-[20px] w-full max-w-[20px] min-w-[20px] items-center text-plain-reverse">
                <NavBarLogo
                  currentCategoryData={currentCategoryData}
                  optionsMenuList={optionsMenuList}
                />
              </figure>
              <NavBarHeading
                currentCategoryData={currentCategoryData}
                headerName={headerName ?? undefined}
                triggerEdit={triggerHeadingEdit}
              />
            </>
          )}
        </div>

        <div
          className={cn({
            "flex w-4/5 items-center justify-between max-lg:justify-end max-sm:mt-0": true,
            "max-lg:w-1/4": !showSearchBar,
            "max-lg:w-full": showSearchBar,
          })}
        >
          {/* this div is there for centering needs */}
          <div className="h-5 w-[1%] max-lg:hidden" />
          <SearchBar
            categoryId={categoryId}
            currentCategoryData={currentCategoryData}
            currentPath={currentPath}
            isDesktop={isDesktop}
            onShowSearchBar={onShowSearchBar}
            showSearchBar={showSearchBar}
          />
          <div className="flex w-[27%] items-center justify-end gap-3 max-xl:w-max max-xl:gap-2">
            {currentPath !== DISCOVER_URL && headerOptions}
            {currentPath !== TRASH_URL && currentPath !== DISCOVER_URL && <AddBookmarkDropdown />}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
};
