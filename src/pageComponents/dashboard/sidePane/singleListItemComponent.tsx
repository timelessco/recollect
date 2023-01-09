import { GlobeIcon, UsersIcon } from '@heroicons/react/solid';
import Link from 'next/link';
import CategoryIconsDropdown from '../../../components/customDropdowns.tsx/categoryIconsDropdown';
import Dropdown from '../../../components/dropdown';
import Spinner from '../../../components/spinner';
import { ChildrenTypes } from '../../../types/componentTypes';

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
        } ${extendedClassname} group px-2 mt-1 flex items-center hover:bg-custom-gray-2 rounded-lg cursor-pointer justify-between side-pane-anchor`}
      >
        <div className="flex items-center">
          {showIconDropdown ? (
            <span onClick={(e) => e.preventDefault()} className="w-5 h-5">
              <CategoryIconsDropdown
                onIconSelect={(value) => {
                  onIconSelect(value, item?.id);
                }}
                iconValue={item?.iconValue || null}
              />
            </span>
          ) : (
            <figure>{item?.icon ? item?.icon() : null}</figure>
          )}
          <p
            className="truncate flex-1 text-sm font-[450] text-custom-gray-1 ml-2 leading-[14px]"
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
            <Dropdown
              buttonClassExtension="hidden group-hover:block"
              menuClassName="origin-top-right left-0"
              options={[
                { label: 'Share', value: 'share' },
                { label: 'Delete', value: 'delete' },
              ]}
              onOptionClick={(dropdownValue) =>
                onCategoryOptionClick(dropdownValue, item.current, item.id)
              }
              renderRightItems={() => {
                return (
                  <>
                    {item?.count !== undefined && (
                      <span
                        className={`text-custom-gray-3 text-[13px] font-normal w-3 h-3 leading-[15px]${
                          showDropdown ? ' block group-hover:hidden' : ' block'
                        }`}
                      >
                        {item?.count}
                      </span>
                    )}
                  </>
                );
              }}
            />
          )}
          {item?.count !== undefined && !showDropdown && (
            <span
              className={`text-custom-gray-3 text-[13px] font-normal leading-[15px] ${
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
