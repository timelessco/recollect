import { Menu, Transition } from '@headlessui/react';
import { PostgrestError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { Fragment, useState } from 'react';
import Button from '../../components/atoms/button';
import Input from '../../components/atoms/input';
import SearchInput from '../../components/searchInput';
import CollectionPlaceholderIcon from '../../icons/collectionPlaceholderIcon';
import DownArrowGray from '../../icons/downArrowGray';
import HomeIconGray from '../../icons/homeIconGray';
import InboxIconGray from '../../icons/inboxIconGray';
import MoodboardIconGray from '../../icons/moodboardIconGray';
import OptionsIconGray from '../../icons/optionsIconGray';
import PlusIconWhite from '../../icons/plusIconWhite';
import SearchIconGray from '../../icons/searchIconGray';
import SortByDateIconGray from '../../icons/sortByDateIconGray';
import TrashIconGray from '../../icons/trashIconGray';
import UserIconGray from '../../icons/userIconGray';
import {
  CategoriesData,
  FetchSharedCategoriesData,
  SingleListData,
} from '../../types/apiTypes';
import { ChildrenTypes } from '../../types/componentTypes';
import {
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  INBOX_URL,
  SEARCH_URL,
  SHARED_CATEGORIES_TABLE_NAME,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from '../../utils/constants';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  PlusCircleIcon,
} from '@heroicons/react/solid';
import Dropdown from '../../components/dropdown';

interface DashboardLayoutProps {
  userImg: string;
  userName: string;
  userEmail: string;
  onSignOutClick: () => void;
  onSigninClick: () => void;
  renderMainContent: () => ChildrenTypes;
  // onDeleteCategoryClick: (id: string, current: boolean) => void;
  bookmarksData?: Array<SingleListData>;
  onAddBookmark: (url: string) => void;
  // onShareClick: (id: string) => void;
  userId: string;
  isAddInputLoading: boolean;
  onAddNewCategory: (value: string) => void;
  onCategoryOptionClick: (
    value: string | number,
    current: boolean,
    id: number
  ) => void;
  onClearTrash: () => void;
}

const DashboardLayout = (props: DashboardLayoutProps) => {
  const {
    renderMainContent,
    userImg,
    // userEmail,
    userName,
    onSignOutClick,
    onSigninClick,
    // onDeleteCategoryClick,
    onAddBookmark,
    // onShareClick,
    userId,
    isAddInputLoading = false,
    onAddNewCategory,
    onCategoryOptionClick,
    onClearTrash,
  } = props;

  const [showSidePane, setShowSidePane] = useState(true);
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);

  const userNavigation = [{ name: 'Sign out', href: '#' }];

  const router = useRouter();
  const queryClient = useQueryClient();

  const currentPath = router.asPath.split('/')[1] || null;

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const bookmarksData = queryClient.getQueryData([BOOKMARKS_KEY, userId]) as {
    data: SingleListData[];
    error: PostgrestError;
  };

  const sharedCategoriesData = queryClient.getQueryData([
    SHARED_CATEGORIES_TABLE_NAME,
  ]) as {
    data: FetchSharedCategoriesData[];
    error: PostgrestError;
  };

  function classNames(...classes: Array<string>) {
    return classes.filter(Boolean).join(' ');
  }

  const renderSidePaneUserDropdown = () => {
    return (
      <div className="flex items-center justify-between">
        {userImg ? (
          <Menu as="div" className="flex-shrink-0 relative">
            <div className="p-1 hover:bg-custom-gray-2 rounded-lg">
              <Menu.Button className="w-full flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <div className="w-6 h-6">
                  <span className="sr-only">Open user menu</span>
                  {userImg && (
                    <Image
                      width={24}
                      height={24}
                      className="h-8 w-8 rounded-full"
                      src={userImg}
                      alt=""
                    />
                  )}
                </div>

                <p className="text-sm font-medium text-custom-gray-1 mx-2 leading-[115%]">
                  {userName}
                </p>
                <DownArrowGray />
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="origin-top-right absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 focus:outline-none">
                {userNavigation.map((item) => (
                  <Menu.Item key={item.name}>
                    {({ active }) => (
                      <div
                        className={` cursor-pointer ${classNames(
                          active ? 'bg-gray-100' : '',
                          'block py-2 px-4 text-sm text-gray-700'
                        )}`}
                        onClick={onSignOutClick}
                      >
                        {item.name}
                      </div>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        ) : (
          <Button onClick={onSigninClick}>Signin</Button>
        )}
        <Button onClick={() => setShowSidePane(false)}>
          <figure>
            <ChevronDoubleLeftIcon className="flex-shrink-0 h-4 w-4 text-gray-400" />
          </figure>
        </Button>
      </div>
    );
  };

  const optionsMenuList = [
    {
      icon: () => <SearchIconGray />,
      name: 'Search',
      href: `/${SEARCH_URL}`,
      current: false,
      id: 0,
    },
    {
      icon: () => <HomeIconGray />,
      name: 'All Bookmarks',
      href: `/`,
      current: !currentPath,
      id: 1,
    },
    {
      icon: () => <InboxIconGray />,
      name: 'Inbox',
      href: `/${UNCATEGORIZED_URL}`,
      current: currentPath === UNCATEGORIZED_URL,
      id: 2,
    },
    {
      icon: () => <TrashIconGray />,
      name: 'Trash',
      href: `/${TRASH_URL}`,
      current: currentPath === TRASH_URL,
      id: 3,
    },
  ];

  interface listPropsTypes {
    item: {
      icon: () => ChildrenTypes;
      name: string;
      href: string;
      current: boolean;
      id: number;
    };
    extendedClassname: string;
    showDropdown?: boolean;
  }

  const SingleListItem = (listProps: listPropsTypes) => {
    const { item, extendedClassname = '', showDropdown = false } = listProps;
    return (
      <Link href={item?.href} passHref={true}>
        <a
          className={`${
            item?.current ? 'bg-custom-gray-2' : 'bg-white'
          } ${extendedClassname} px-2 mt-1 flex items-center hover:bg-custom-gray-2 rounded-lg cursor-pointer justify-between`}
        >
          <div className="flex items-center">
            <figure>{item?.icon()}</figure>
            <p className="truncate flex-1 text-sm font-[450] text-custom-gray-1 ml-3 leading-[14px]">
              {item?.name}
            </p>
          </div>
          {showDropdown && (
            <Dropdown
              menuClassName="origin-top-right left-0"
              options={[
                { label: 'Share', value: 'share' },
                { label: 'Delete', value: 'delete' },
              ]}
              onOptionClick={(dropdownValue) =>
                onCategoryOptionClick(dropdownValue, item.current, item.id)
              }
            />
          )}
        </a>
      </Link>
    );
  };
  const renderSidePaneOptionsMenu = () => {
    return (
      <div className="pt-[10px]">
        {optionsMenuList?.map((item, index) => {
          return (
            <SingleListItem
              extendedClassname="py-[7px]"
              key={index}
              item={item}
            />
          );
        })}
      </div>
    );
  };

  const collectionsList = userImg
    ? categoryData?.data?.map((item) => {
        return {
          name: item?.category_name,
          href: `/${item?.category_slug}`,
          id: item?.id,
          current: currentPath === item?.category_slug,
          isPublic: item?.is_public,
          isCollab: !isEmpty(
            find(
              sharedCategoriesData?.data,
              (cat) => cat?.category_id === item?.id
            )
          ),
          icon: () => <CollectionPlaceholderIcon />,
        };
      })
    : [];

  const renderSidePaneCollections = () => {
    return (
      <div className="pt-[25px]">
        <p className="font-medium text-[13px] leading-[115%] px-1 text-custom-gray-3">
          Collections
        </p>
        <div className="pt-3">
          {collectionsList?.map((item, index) => {
            return (
              <SingleListItem
                extendedClassname="py-[5px]"
                item={item}
                key={index}
                showDropdown={true}
              />
            );
          })}
          {showAddCategoryInput && (
            <div className="px-2 py-[3px]">
              <input
                placeholder="Enter name"
                className="bg-white text-sm font-[450] text-custom-gray-1 "
                autoFocus
                onBlur={() => setShowAddCategoryInput(false)}
                onKeyUp={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !isEmpty((e.target as HTMLInputElement).value)
                  ) {
                    onAddNewCategory((e.target as HTMLInputElement).value);
                    setShowAddCategoryInput(false);
                  }
                }}
              />
            </div>
          )}
          <div
            className="py-[7px] px-2 mt-1 flex items-center hover:bg-custom-gray-2 rounded-lg cursor-pointer"
            onClick={() => setShowAddCategoryInput(true)}
          >
            <PlusCircleIcon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
            <p className="truncate flex-1 text-sm font-[450] text-custom-gray-1 leading-[16px]">
              Add Category
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderMainPaneNav = () => {
    return (
      <div className="py-[9px] px-4 border-b-[0.5px] border-b-custom-gray-4 flex items-center justify-between">
        <div className="flex items-center space-x-[9px]">
          <figure className="w-6 h-6">
            {/* TODO: this svg needs to come from api */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="24" height="24" rx="12" fill="#F59B32" />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10.6003 19C10.722 19 10.8403 18.9616 10.9375 18.8907C11.0346 18.8198 11.1053 18.7203 11.1387 18.6071L11.7458 16.5514C11.8765 16.1087 12.1217 15.7056 12.4583 15.38C12.7949 15.0544 13.2117 14.8173 13.6694 14.6908L15.7947 14.1036C15.9116 14.0712 16.0145 14.0028 16.0877 13.9089C16.1609 13.8149 16.2005 13.7005 16.2005 13.5828C16.2005 13.4652 16.1609 13.3507 16.0877 13.2568C16.0145 13.1628 15.9116 13.0945 15.7947 13.062L13.6694 12.4748C13.2117 12.3484 12.7949 12.1112 12.4583 11.7856C12.1217 11.4601 11.8765 11.0569 11.7458 10.6142L11.1387 8.55857C11.1052 8.44546 11.0345 8.34598 10.9374 8.27516C10.8402 8.20434 10.7219 8.16603 10.6003 8.16603C10.4786 8.16603 10.3603 8.20434 10.2632 8.27516C10.166 8.34598 10.0954 8.44546 10.0619 8.55857L9.45474 10.6142C9.32402 11.0569 9.07879 11.4601 8.74221 11.7856C8.40563 12.1112 7.9888 12.3484 7.5311 12.4748L5.40583 13.062C5.28889 13.0945 5.18604 13.1628 5.11282 13.2568C5.0396 13.3507 5 13.4652 5 13.5828C5 13.7005 5.0396 13.8149 5.11282 13.9089C5.18604 14.0028 5.28889 14.0712 5.40583 14.1036L7.5311 14.6908C7.9888 14.8173 8.40563 15.0544 8.74221 15.38C9.07879 15.7056 9.32402 16.1087 9.45474 16.5514L10.0619 18.6071C10.0953 18.7203 10.1659 18.8198 10.2631 18.8907C10.3602 18.9616 10.4786 19 10.6003 19ZM16.2009 11.4159C16.3186 11.416 16.4332 11.3803 16.5287 11.3137C16.6241 11.2472 16.6955 11.1534 16.7326 11.0454L17.0269 10.1909C17.1389 9.86808 17.4002 9.61384 17.7348 9.50621L18.6182 9.22091C18.7294 9.18478 18.8261 9.11578 18.8946 9.02363C18.9631 8.93149 19 8.82086 19 8.70736C19 8.59386 18.9631 8.48323 18.8946 8.39108C18.8261 8.29894 18.7294 8.22993 18.6182 8.19381L17.7348 7.90851C17.401 7.80016 17.1381 7.54736 17.0269 7.22377L16.7319 6.3693C16.6945 6.26171 16.6232 6.16818 16.5279 6.10191C16.4327 6.03565 16.3183 6 16.2009 6C16.0836 6 15.9692 6.03565 15.874 6.10191C15.7787 6.16818 15.7073 6.26171 15.67 6.3693L15.375 7.22377C15.32 7.3832 15.2274 7.52806 15.1046 7.6469C14.9817 7.76574 14.8319 7.8553 14.6671 7.90851L13.7837 8.19381C13.6724 8.22993 13.5757 8.29894 13.5072 8.39108C13.4387 8.48323 13.4019 8.59386 13.4019 8.70736C13.4019 8.82086 13.4387 8.93149 13.5072 9.02363C13.5757 9.11578 13.6724 9.18478 13.7837 9.22091L14.6671 9.50621C15.0009 9.61456 15.2638 9.86736 15.375 10.1909L15.67 11.0454C15.7071 11.1532 15.7784 11.247 15.8737 11.3135C15.9689 11.38 16.0834 11.4159 16.2009 11.4159Z"
                fill="white"
              />
            </svg>
          </figure>
          <p className="font-semibold text-xl leading-6 text-black">
            {find(
              categoryData?.data,
              (item) => item?.category_slug === currentPath
            )?.category_name || 'All Bookmarks'}
          </p>
        </div>
        <SearchInput
          placeholder={`Search in ${
            find(
              categoryData?.data,
              (item) => item?.category_slug === currentPath
            )?.category_name || 'All Bookmarks'
          }`}
        />
        <div className="flex items-center">
          <div className="flex items-center mr-[17px] space-x-1">
            <Button type="light">
              <figure className="w-3 h-3">
                <MoodboardIconGray />
              </figure>
              <span className="ml-[7px] text-custom-gray-1">Moodboard</span>
            </Button>
            <Button type="light">
              <figure className="w-3 h-3">
                <SortByDateIconGray />
              </figure>
              <span className="ml-[7px] text-custom-gray-1">By Date</span>
            </Button>
            <Button type="light">
              <figure className="w-3 h-3">
                <UserIconGray />
              </figure>
              <span className="ml-[7px] text-custom-gray-1">Share</span>
            </Button>
            <Menu as="div" className="flex-shrink-0 relative">
              <Menu.Button as="div">
                <Button type="light" className="p-[5px]" style={{ padding: 5 }}>
                  <figure className="w-4 h-4">
                    <OptionsIconGray />
                  </figure>
                </Button>
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="origin-top-left right-0 absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 focus:outline-none">
                  <Menu.Item>
                    {({ active }) => (
                      <div
                        className={` cursor-pointer ${classNames(
                          active ? 'bg-gray-100' : '',
                          'block py-2 px-4 text-sm text-gray-700'
                        )}`}
                      >
                        Option one
                      </div>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>

          {currentPath === TRASH_URL && (
            <Button
              type="dark"
              className="mr-[17px] bg-red-700 hover:bg-red-900"
              onClick={() => onClearTrash()}
            >
              <span className="text-white">Clear Trash</span>
            </Button>
          )}

          <Button type="dark">
            <figure className="w-3 h-3">
              <PlusIconWhite />
            </figure>
            <span className="ml-[7px] text-white">Add</span>
          </Button>
        </div>
      </div>
    );
  };
  return (
    <div style={{ width: '100vw', height: '100vw' }}>
      {!showSidePane && (
        <Button
          className="absolute bg-slate-200 cursor-pointer z-50 top-[64px] left-[12px] shadow-2xl"
          onClick={() => setShowSidePane(true)}
        >
          <figure>
            <ChevronDoubleRightIcon className="flex-shrink-0 h-4 w-4 text-gray-400" />
          </figure>
        </Button>
      )}
      <Allotment defaultSizes={[244, 1200]} separator={false}>
        <Allotment.Pane maxSize={600} minSize={244} visible={showSidePane}>
          <nav className="p-2 border-r-[0.5px] border-r-custom-gray-4 h-full">
            {renderSidePaneUserDropdown()}
            {renderSidePaneOptionsMenu()}
            {renderSidePaneCollections()}
          </nav>
        </Allotment.Pane>
        <Allotment.Pane>
          <div className="w-full">
            {renderMainPaneNav()}
            <main className="overflow-y-auto py-4">{renderMainContent()}</main>
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};

export default DashboardLayout;
