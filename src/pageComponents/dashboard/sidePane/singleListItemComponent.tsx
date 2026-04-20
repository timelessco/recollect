import Link from "next/link";
import { use } from "react";

import type { CategoriesData } from "../../../types/apiTypes";
import type { ChildrenTypes } from "../../../types/componentTypes";

import { CategoryIconsDropdown } from "../../../components/customDropdowns.tsx/categoryIconsDropdown";
import { Spinner } from "../../../components/spinner";
import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { CollectionOptionsPopover } from "./collection-options-popover";
import { DragHandleContext } from "./reorderable-list";

export interface CollectionItemTypes {
  count?: number;
  current: boolean;
  href: string;
  icon?: ChildrenTypes;
  iconColor: CategoriesData["icon_color"];
  iconValue?: null | string;
  id: number;
  isCollab?: boolean;
  isFavorite?: boolean;
  isPublic?: boolean;
  name: string;
  responsiveIcon?: boolean;
}

export interface listPropsTypes {
  extendedClassname: string;
  isLink?: boolean;
  item: CollectionItemTypes;
  listNameId?: string;
  onClick?: () => void;
  /** Fires right before Next.js navigation — used to emit `category_switch`. */
  onNavigate?: () => void;
  responsiveIcon?: boolean;
  showDropdown?: boolean;
  showIconDropdown?: boolean;
  showSpinner?: boolean;
}

const SingleListItemComponent = (listProps: listPropsTypes) => {
  const {
    extendedClassname = "",
    isLink = true,
    item,
    listNameId = "",
    onClick = () => null,
    onNavigate,
    responsiveIcon = false,
    showDropdown = false,
    showIconDropdown = true,
    showSpinner = false,
  } = listProps;
  const { isDesktop } = useIsMobileView();
  const dragHandleProps = use(DragHandleContext);
  const renderContent = () => (
    <>
      <div
        className={`flex items-center ${dragHandleProps ? "mr-5 flex-1" : ""}`}
        {...dragHandleProps}
      >
        {showIconDropdown ? (
          // disabling eslint as the onClick is just preventdefault
          // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <span
            className="flex h-[18px] w-[18px]"
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            <CategoryIconsDropdown
              buttonIconSize={18}
              iconColor={item?.iconColor}
              iconId={item?.id}
              iconValue={item?.iconValue ?? null}
            />
          </span>
        ) : (
          <figure className="flex h-[18px] w-[18px] items-center text-gray-900">
            {item?.icon ?? null}
          </figure>
        )}
        {(!responsiveIcon || isDesktop) && (
          <p
            className="ml-2 flex-1 truncate overflow-hidden text-[14px] leading-[115%] font-450 tracking-[0.01em]"
            id={listNameId}
          >
            {item?.name}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-3">
        {showDropdown && (
          // disabling eslint as the onClick is just preventdefault
          // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div
            className="flex items-center justify-center"
            onClick={(event) => {
              event.preventDefault();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            {showSpinner ? (
              <Spinner
                className="h-3 w-3 animate-spin"
                style={{ color: "var(--color-plain-reverse)" }}
              />
            ) : (
              <CollectionOptionsPopover item={item} />
            )}
          </div>
        )}
        {item?.count !== undefined &&
          !showDropdown &&
          item?.current &&
          item?.name !== "Everything" &&
          item?.name !== "Inbox" &&
          item?.name !== "Trash" && (
            <span className="block text-[11px] leading-3 font-450 text-gray-600">
              {item?.count}
            </span>
          )}
      </div>
    </>
  );

  const contentWrapperClassNames = `${
    item?.current ? "bg-gray-100 text-gray-900" : "text-gray-800"
  } ${extendedClassname} side-pane-anchor group flex cursor-pointer items-center justify-between rounded-lg px-2 outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gray-200 hover:bg-gray-100 hover:text-gray-900`;

  if (isLink) {
    return (
      <Link
        className={contentWrapperClassNames}
        draggable={false}
        href={item?.href}
        onClick={onNavigate}
        passHref
      >
        {renderContent()}
      </Link>
    );
  }

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className={contentWrapperClassNames} onClick={onClick}>
      {renderContent()}
    </div>
  );
};

export default SingleListItemComponent;
