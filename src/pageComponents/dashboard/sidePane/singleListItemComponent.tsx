import { GlobeIcon, UsersIcon } from '@heroicons/react/solid';
import Link from 'next/link';
import CategoryIconsDropdown from '../../../components/customDropdowns.tsx/categoryIconsDropdown';
import {
  AriaDropdown,
  AriaDropdownMenu,
} from '../../../components/ariaDropdown';
import Spinner from '../../../components/spinner';
import OptionsIconGray from '../../../icons/optionsIconGray';
import { ChildrenTypes } from '../../../types/componentTypes';
import { useState } from 'react';
import {
  dropdownMenuClassName,
  dropdownMenuItemClassName,
} from '../../../utils/commonClassNames';

interface listPropsTypes {
  item: {
    icon?: () => ChildrenTypes;
    name: string;
    href: string;
    current: boolean;
    id: number;
    iconValue?: string | null;
    count?: number;
    isPublic?: boolean;
    isCollab?: boolean;
  };
  extendedClassname: string;
  showDropdown?: boolean;
  showIconDropdown?: boolean;
  listNameId?: string;
  onIconSelect?: (value: string, id: number) => void;
  onCategoryOptionClick?: (
    value: string | number,
    current: boolean,
    id: number
  ) => void;
  showSpinner?: boolean;
}

const SingleListItemComponent = (listProps: listPropsTypes) => {
  const [openedMenuId, setOpenedMenuId] = useState<number | null>(null);

  const {
    item,
    extendedClassname = '',
    showDropdown = false,
    showIconDropdown = true,
    listNameId = '',
    onIconSelect = () => null,
    onCategoryOptionClick = () => null,
    showSpinner = false,
  } = listProps;
  return (
    <Link href={item?.href} passHref={true}>
      <a
        draggable={false}
        className={`${
          item?.current ? 'bg-custom-gray-2' : 'bg-white'
        } ${extendedClassname} group px-2 flex items-center hover:bg-custom-gray-2 rounded-lg cursor-pointer justify-between side-pane-anchor`}
      >
        <div className="flex items-center w-4/5">
          {showIconDropdown ? (
            <span
              onClick={(e) => e.preventDefault()}
              className="w-[18px] h-[18px]"
            >
              <CategoryIconsDropdown
                onIconSelect={(value) => {
                  onIconSelect(value, item?.id);
                }}
                iconValue={item?.iconValue || null}
              />
            </span>
          ) : (
            <figure className="w-[18px] h-[18px] flex items-center">
              {item?.icon ? item?.icon() : null}
            </figure>
          )}
          <p
            className="truncate overflow-hidden flex-1 text-sm font-[450] text-custom-gray-1 ml-2 leading-4"
            id={listNameId}
          >
            {item?.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {showSpinner && <Spinner />}
          {item?.isPublic && (
            <figure>
              <GlobeIcon className="flex-shrink-0 h-4 w-4 text-gray-400" />
            </figure>
          )}
          {item?.isCollab && (
            <UsersIcon className="flex-shrink-0 h-4 w-4 text-gray-400" />
          )}
          {showDropdown && (
            <div onClick={(e) => e.preventDefault()} className="w-4 h-4 flex">
              <AriaDropdown
                menuClassName={`${dropdownMenuClassName} z-10`}
                menuButton={
                  <div
                    className={
                      openedMenuId === item?.id
                        ? 'flex'
                        : 'hidden group-hover:flex'
                    }
                  >
                    <OptionsIconGray />
                  </div>
                }
                menuOpenToggle={(value) => {
                  if (value === true) {
                    setOpenedMenuId(item?.id);
                  } else {
                    setOpenedMenuId(null);
                  }
                }}
              >
                {[
                  { label: 'Share', value: 'share' },
                  { label: 'Delete', value: 'delete' },
                ]?.map((dropdownItem) => (
                  <AriaDropdownMenu
                    key={dropdownItem?.value}
                    onClick={() =>
                      onCategoryOptionClick(
                        dropdownItem?.value,
                        item.current,
                        item.id
                      )
                    }
                  >
                    <div className={dropdownMenuItemClassName}>
                      {dropdownItem?.label}
                    </div>
                  </AriaDropdownMenu>
                ))}
              </AriaDropdown>
              <>
                {item?.count !== undefined && openedMenuId === null && (
                  <p
                    className={`text-custom-gray-10 text-[11px] font-450 w-4 h-4 leading-3 text-right flex items-center justify-end ${
                      showDropdown ? ' block group-hover:hidden' : ' block'
                    }`}
                  >
                    {item?.count}
                  </p>
                )}
              </>
            </div>
          )}

          {item?.count !== undefined && !showDropdown && (
            <span
              className={`text-custom-gray-10 text-[11px] font-450 leading-3 ${
                showDropdown ? 'block group-hover:hidden' : 'block'
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
