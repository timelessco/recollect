import { Menu, Transition } from '@headlessui/react';
import { PostgrestError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import Button from '../../components/atoms/button';
import SearchInput from '../../components/searchInput';
import DownArrowGray from '../../icons/downArrowGray';
import HomeIconGray from '../../icons/homeIconGray';
import InboxIconGray from '../../icons/inboxIconGray';
import OptionsIconGray from '../../icons/optionsIconGray';
import PlusIconWhite from '../../icons/plusIconWhite';
import SearchIconGray from '../../icons/searchIconGray';
import TrashIconGray from '../../icons/trashIconGray';
import UserIconGray from '../../icons/userIconGray';
import {
  BookmarksCountTypes,
  CategoriesData,
  FetchSharedCategoriesData,
} from '../../types/apiTypes';
import { CategoryIdUrlTypes, ChildrenTypes } from '../../types/componentTypes';
import {
  ALL_BOOKMARKS_URL,
  BOOKMARKS_COUNT_KEY,
  CATEGORIES_KEY,
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
  GlobeIcon,
  UsersIcon,
} from '@heroicons/react/solid';
import Dropdown from '../../components/dropdown';
import CategoryIconsDropdown from '../../components/customDropdowns.tsx/categoryIconsDropdown';
import AddCategoryIcon from '../../icons/addCategoryIcon';
import FileIcon from '../../icons/categoryIcons/fileIcon';
import { options } from '../../utils/commonData';
import BookmarksViewDropdown from '../../components/customDropdowns.tsx/bookmarksViewDropdown';
import BookmarksSortDropdown from '../../components/customDropdowns.tsx/bookmarksSortDropdown';
import {
  BookmarksSortByTypes,
  BookmarksViewTypes,
  BookmarkViewCategories,
} from '../../types/componentStoreTypes';
import { useMiscellaneousStore } from '../../store/componentStore';
import CollectionsList from './sidePane/collectionsList';
import SingleListItemComponent from './sidePane/singleListItemComponent';

interface DashboardLayoutProps {
  categoryId: CategoryIdUrlTypes;
  userImg: string;
  userName: string;
  userEmail: string;
  onSignOutClick: () => void;
  renderMainContent: () => ChildrenTypes;
  // onDeleteCategoryClick: (id: string, current: boolean) => void;
  onAddBookmark: (url: string) => void;
  onShareClick: () => void;
  userId: string;
  isAddInputLoading: boolean;
  onAddNewCategory: (value: string) => void;
  onCategoryOptionClick: (
    value: string | number,
    current: boolean,
    id: number
  ) => void;
  onClearTrash: () => void;
  onIconSelect: (value: string, id: number) => void;
  setBookmarksView: (
    value: BookmarksViewTypes | string[] | number[] | BookmarksSortByTypes,
    type: BookmarkViewCategories
  ) => void;
  onNavAddClick: () => void;
  onBookmarksDrop: (e: any) => Promise<void>;
}

const DashboardLayout = (props: DashboardLayoutProps) => {
  const {
    categoryId,
    renderMainContent,
    userImg,
    // userEmail,
    userName,
    onSignOutClick,
    // onDeleteCategoryClick,
    onShareClick,
    userId,
    onAddNewCategory,
    onCategoryOptionClick,
    onClearTrash,
    onIconSelect,
    setBookmarksView,
    onNavAddClick,
    onBookmarksDrop,
  } = props;

  const [showSidePane, setShowSidePane] = useState(true);
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [screenWidth, setScreenWidth] = useState(1200);

  useEffect(() => {
    if (screen) {
      setScreenWidth(screen.width);
    }
  }, []);

  useEffect(() => {
    setSearchText('');
  }, [categoryId]);

  const userNavigation = [{ name: 'Sign out', href: '#', value: 'sign-out' }];

  const router = useRouter();
  const queryClient = useQueryClient();

  const currentPath = router.asPath.split('/')[1] || null;

  const setSearchText = useMiscellaneousStore((state) => state.setSearchText);

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const bookmarksCountData = queryClient.getQueryData([
    BOOKMARKS_COUNT_KEY,
    userId,
  ]) as {
    data: BookmarksCountTypes;
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
        {userName ? (
          <Menu as="div" className="flex-shrink-0 relative">
            <div className="p-1 hover:bg-custom-gray-2 rounded-lg">
              <Menu.Button className="user-menu-btn w-full flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
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

                <p
                  className="text-sm font-medium text-custom-gray-1 mx-2 leading-[115%]"
                  id="user-name"
                >
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
                        className={`${item?.value} cursor-pointer ${classNames(
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
          <Button>Signin</Button>
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
      current: currentPath === SEARCH_URL,
      id: 0,
      count: undefined,
    },
    {
      icon: () => <HomeIconGray />,
      name: 'All Bookmarks',
      href: `/${ALL_BOOKMARKS_URL}`,
      current: currentPath === ALL_BOOKMARKS_URL,
      id: 1,
      count: bookmarksCountData?.data?.allBookmarks,
    },
    {
      icon: () => <InboxIconGray />,
      name: 'Inbox',
      href: `/${UNCATEGORIZED_URL}`,
      current: currentPath === UNCATEGORIZED_URL,
      id: 2,
      count: bookmarksCountData?.data?.uncategorized,
    },
    {
      icon: () => <TrashIconGray />,
      name: 'Trash',
      href: `/${TRASH_URL}`,
      current: currentPath === TRASH_URL,
      id: 3,
      count: bookmarksCountData?.data?.trash,
    },
  ];

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
  }

  const renderSidePaneOptionsMenu = () => {
    return (
      <div className="pt-[10px]">
        {optionsMenuList?.map((item, index) => {
          return (
            <SingleListItem
              extendedClassname="py-[7px]"
              key={index}
              item={item}
              showIconDropdown={false}
            />
          );
        })}
      </div>
    );
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const SingleListItem = React.useCallback(SingleListItemComponent, []);

  const renderSidePaneCollections = useCallback(() => {
    const collectionsList = userName
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
            iconValue: item?.icon,
            count: find(
              bookmarksCountData?.data?.categoryCount,
              (catItem) => catItem?.category_id === item?.id
            )?.count,
          };
        })
      : [];

    return (
      <div className="pt-[25px]">
        <p className="font-medium text-[13px] leading-[115%] px-1 text-custom-gray-3">
          Collections
        </p>
        <div className="pt-3">
          <div id="collections-wrapper">
            {collectionsList?.map((item, index) => {
              return (
                <SingleListItem
                  extendedClassname="py-[5px]"
                  item={item}
                  key={index}
                  showDropdown={true}
                  listNameId="collection-name"
                />
              );
            })}
          </div>
          {showAddCategoryInput && (
            <div
              className={`px-2 py-[5px] mt-1 flex items-center bg-custom-gray-2 rounded-lg cursor-pointer justify-between`}
            >
              <div className="flex items-center">
                <figure className="mr-2">
                  <FileIcon />
                </figure>
                <input
                  placeholder="Category Name"
                  id="add-category-input"
                  className="text-sm font-[450] text-custom-gray-5 leading-4 focus:outline-none bg-black/[0.004] opacity-40"
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
            </div>
          )}
          <div
            className="py-[5px] px-2 mt-1 flex items-center hover:bg-custom-gray-2 rounded-lg cursor-pointer"
            onClick={() => setShowAddCategoryInput(true)}
            id="add-category-button"
          >
            <figure>
              <AddCategoryIcon />
            </figure>
            <p className="truncate ml-2 flex-1 text-sm font-medium text-custom-gray-3 leading-[16px]">
              Add Category
            </p>
          </div>
        </div>
      </div>
    );
  }, [
    SingleListItem,
    bookmarksCountData?.data?.categoryCount,
    categoryData?.data,
    currentPath,
    onAddNewCategory,
    sharedCategoriesData?.data,
    showAddCategoryInput,
    userName,
  ]);

  const navBarLogo = () => {
    const currentCategory = find(
      categoryData?.data,
      (item) => item?.category_slug === currentPath
    );

    if (currentCategory) {
      return find(
        options,
        (item) => item?.label === currentCategory?.icon
      )?.icon();
    } else {
      return find(optionsMenuList, (item) => item?.current === true)?.icon();
    }
  };

  const renderMainPaneNav = () => {
    return (
      <header className="py-[9px] px-4 border-b-[0.5px] border-b-custom-gray-4 flex items-center justify-between">
        <div className="flex items-center space-x-[9px]">
          <figure className="w-5 h-5 flex items-center">{navBarLogo()}</figure>
          <p className="font-semibold text-xl leading-6 text-black">
            {find(
              categoryData?.data,
              (item) => item?.category_slug === currentPath
            )?.category_name ||
              find(optionsMenuList, (item) => item?.current === true)?.name}
          </p>
        </div>
        <SearchInput
          userId={userId}
          placeholder={`Search in ${
            find(
              categoryData?.data,
              (item) => item?.category_slug === currentPath
            )?.category_name || 'All Bookmarks'
          }`}
          onChange={(value) => {
            setSearchText(value);
          }}
        />
        <div className="flex items-center">
          <div className="flex items-center mr-[17px] space-x-1">
            <BookmarksViewDropdown
              setBookmarksView={setBookmarksView}
              categoryId={categoryId}
              userId={userId}
            />
            <BookmarksSortDropdown
              setBookmarksView={setBookmarksView}
              categoryId={categoryId}
              userId={userId}
            />
            {typeof categoryId === 'number' && (
              <Button
                type="light"
                onClick={() => onShareClick()}
                id="share-button"
              >
                <figure className="w-3 h-3">
                  <UserIconGray />
                </figure>
                <span className="ml-[7px] text-custom-gray-1">Share</span>
              </Button>
            )}
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
              id="clear-trash-button"
            >
              <span className="text-white">Clear Trash</span>
            </Button>
          )}

          <Button type="dark" onClick={onNavAddClick}>
            <figure className="w-3 h-3">
              <PlusIconWhite />
            </figure>
            <span className="ml-[7px] text-white">Add</span>
          </Button>
        </div>
      </header>
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
      <Allotment
        defaultSizes={[144, screenWidth]}
        separator={false}
        onVisibleChange={() => setShowSidePane(false)}
      >
        <Allotment.Pane
          maxSize={600}
          minSize={244}
          visible={showSidePane}
          snap
          className="transition-all ease-in-out duration-150"
        >
          <nav className="p-2 border-r-[0.5px] border-r-custom-gray-4 h-full">
            {renderSidePaneUserDropdown()}
            {renderSidePaneOptionsMenu()}
            {/* {renderSidePaneCollections()} */}
            <CollectionsList
              onBookmarksDrop={onBookmarksDrop}
              onCategoryOptionClick={onCategoryOptionClick}
              onIconSelect={(value, id) => onIconSelect(value, id)}
              onAddNewCategory={onAddNewCategory}
            />
          </nav>
        </Allotment.Pane>
        <Allotment.Pane className="transition-all ease-in-out duration-150">
          <div className="w-full">
            {renderMainPaneNav()}
            <main className="py-4">{renderMainContent()}</main>
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};

export default DashboardLayout;