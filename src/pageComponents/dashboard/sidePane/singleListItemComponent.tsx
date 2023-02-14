import { GlobeIcon, UsersIcon } from "@heroicons/react/solid";
import Link from "next/link";
import { useState } from "react";

import {
  AriaDropdown,
  AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import CategoryIconsDropdown from "../../../components/customDropdowns.tsx/categoryIconsDropdown";
import Spinner from "../../../components/spinner";
import OptionsIconGray from "../../../icons/optionsIconGray";
import type { ChildrenTypes } from "../../../types/componentTypes";
import {
  dropdownMenuClassName,
  dropdownMenuItemClassName,
} from "../../../utils/commonClassNames";

export interface CollectionItemTypes {
  icon?: ChildrenTypes;
  name: string;
  href: string;
  current: boolean;
  id: number;
  iconValue?: string | null;
  count?: number;
  isPublic?: boolean;
  isCollab?: boolean;
}

export interface listPropsTypes {
  item: CollectionItemTypes;
  extendedClassname: string;
  showDropdown?: boolean;
  showIconDropdown?: boolean;
  listNameId?: string;
  onIconSelect?: (value: string, id: number) => void;
  onCategoryOptionClick?: (
    value: string | number,
    current: boolean,
    id: number,
  ) => void;
  showSpinner?: boolean;
}

const SingleListItemComponent = (listProps: listPropsTypes) => {
  const [openedMenuId, setOpenedMenuId] = useState<number | null>(null);

  const {
    item,
    extendedClassname = "",
    showDropdown = false,
    showIconDropdown = true,
    listNameId = "",
    onIconSelect = () => null,
    onCategoryOptionClick = () => null,
    showSpinner = false,
  } = listProps;
  return (
    <Link href={item?.href} passHref legacyBehavior>
      <a
        draggable={false}
        className={`${
          item?.current ? "bg-custom-gray-2" : "bg-white"
        } ${extendedClassname} side-pane-anchor group flex cursor-pointer items-center justify-between rounded-lg px-2 hover:bg-custom-gray-2`}
      >
        <div className="flex w-4/5 items-center">
          {showIconDropdown ? (
            // disabling eslint as the onClick is just preventdefault
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            <span
              onClick={e => e.preventDefault()}
              className="h-[18px] w-[18px]"
            >
              <CategoryIconsDropdown
                onIconSelect={value => {
                  onIconSelect(value, item?.id);
                }}
                iconValue={item?.iconValue || null}
              />
            </span>
          ) : (
            <figure className="flex h-[18px] w-[18px] items-center">
              {item?.icon ? item?.icon : null}
            </figure>
          )}
          <p
            className="ml-2 flex-1 overflow-hidden truncate text-sm font-[450] leading-4 text-custom-gray-1"
            id={listNameId}
          >
            {item?.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {showSpinner && <Spinner />}
          {item?.isPublic && (
            <figure>
              <GlobeIcon className="h-4 w-4 shrink-0 text-gray-400" />
            </figure>
          )}
          {item?.isCollab && (
            <UsersIcon className="h-4 w-4 shrink-0 text-gray-400" />
          )}
          {showDropdown && (
            // disabling eslint as the onClick is just preventdefault
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            <div onClick={e => e.preventDefault()} className="flex h-4 w-4">
              <AriaDropdown
                menuClassName={`${dropdownMenuClassName} z-10`}
                menuButton={
                  <div
                    className={
                      openedMenuId === item?.id
                        ? "flex"
                        : "hidden group-hover:flex"
                    }
                  >
                    <OptionsIconGray />
                  </div>
                }
                menuOpenToggle={value => {
                  if (value === true) {
                    setOpenedMenuId(item?.id);
                  } else {
                    setOpenedMenuId(null);
                  }
                }}
              >
                {[
                  { label: "Share", value: "share" },
                  { label: "Delete", value: "delete" },
                ]?.map(dropdownItem => (
                  <AriaDropdownMenu
                    key={dropdownItem?.value}
                    onClick={() =>
                      onCategoryOptionClick(
                        dropdownItem?.value,
                        item.current,
                        item.id,
                      )
                    }
                  >
                    <div className={dropdownMenuItemClassName}>
                      {dropdownItem?.label}
                    </div>
                  </AriaDropdownMenu>
                ))}
              </AriaDropdown>
              {item?.count !== undefined && openedMenuId === null && (
                <p
                  className={`flex h-4 w-4 items-center justify-end text-right text-[11px] font-450 leading-3 text-custom-gray-10 ${
                    showDropdown ? " block group-hover:hidden" : " block"
                  }`}
                >
                  {item?.count}
                </p>
              )}
            </div>
          )}

          {item?.count !== undefined && !showDropdown && (
            <span
              className={`text-[11px] font-450 leading-3 text-custom-gray-10 ${
                showDropdown ? "block group-hover:hidden" : "block"
              }`}
            >
              {item?.count}
            </span>
          )}
        </div>
      </a>
    </Link>
  );
};

export default SingleListItemComponent;
