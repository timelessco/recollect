import { Menu, Transition } from "@headlessui/react";
import { ChevronDoubleRightIcon } from "@heroicons/react/solid";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Allotment } from "allotment";
import find from "lodash/find";
import React, { Fragment, useEffect, useState } from "react";

import Button from "../../components/atoms/button";
import SearchInput from "../../components/searchInput";
import HomeIconGray from "../../icons/homeIconGray";
import InboxIconGray from "../../icons/inboxIconGray";
import OptionsIconGray from "../../icons/optionsIconGray";
import PlusIconWhite from "../../icons/plusIconWhite";
import SearchIconGray from "../../icons/searchIconGray";
import TrashIconGray from "../../icons/trashIconGray";
import UserIconGray from "../../icons/userIconGray";
import type { BookmarksCountTypes, CategoriesData } from "../../types/apiTypes";
import type {
  CategoryIdUrlTypes,
  ChildrenTypes,
} from "../../types/componentTypes";
import {
  ALL_BOOKMARKS_URL,
  BOOKMARKS_COUNT_KEY,
  CATEGORIES_KEY,
  SEARCH_URL,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from "../../utils/constants";

import "allotment/dist/style.css";
import BookmarksSortDropdown from "../../components/customDropdowns.tsx/bookmarksSortDropdown";
import BookmarksViewDropdown from "../../components/customDropdowns.tsx/bookmarksViewDropdown";
import useGetCurrentUrlPath from "../../hooks/useGetCurrentUrlPath";
import { useMiscellaneousStore } from "../../store/componentStore";
import type {
  BookmarksSortByTypes,
  BookmarksViewTypes,
  BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { options } from "../../utils/commonData";

import SidePane from "./sidePane";

interface DashboardLayoutProps {
  categoryId: CategoryIdUrlTypes;
  renderMainContent: () => ChildrenTypes;
  onShareClick: () => void;
  userId: string;
  onAddNewCategory: (value: string) => Promise<void>;
  onCategoryOptionClick: (
    value: string | number,
    current: boolean,
    id: number,
  ) => Promise<void>;
  onClearTrash: () => void;
  onIconSelect: (value: string, id: number) => void;
  setBookmarksView: (
    value: BookmarksViewTypes | string[] | number[] | BookmarksSortByTypes,
    type: BookmarkViewCategories,
  ) => void;
  onNavAddClick: () => void;
  onBookmarksDrop: (e: any) => Promise<void>;
}

const DashboardLayout = (props: DashboardLayoutProps) => {
  const {
    categoryId,
    renderMainContent,
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

  const [screenWidth, setScreenWidth] = useState(1200);

  useEffect(() => {
    // disabling as we need this for allotement width
    // eslint-disable-next-line no-restricted-globals
    if (screen) {
      // eslint-disable-next-line no-restricted-globals
      setScreenWidth(screen.width);
    }
  }, []);

  const queryClient = useQueryClient();

  const currentPath = useGetCurrentUrlPath();

  const setSearchText = useMiscellaneousStore(state => state.setSearchText);
  const showSidePane = useMiscellaneousStore(state => state.showSidePane);
  const setShowSidePane = useMiscellaneousStore(state => state.setShowSidePane);

  useEffect(() => {
    setSearchText("");
  }, [categoryId, setSearchText]);

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

  function classNames(...classes: Array<string>) {
    return classes.filter(Boolean).join(" ");
  }

  const optionsMenuList = [
    {
      icon: <SearchIconGray />,
      name: "Search",
      href: `/${SEARCH_URL}`,
      current: currentPath === SEARCH_URL,
      id: 0,
      count: undefined,
    },
    {
      icon: <HomeIconGray />,
      name: "All Bookmarks",
      href: `/${ALL_BOOKMARKS_URL}`,
      current: currentPath === ALL_BOOKMARKS_URL,
      id: 1,
      count: bookmarksCountData?.data?.allBookmarks,
    },
    {
      icon: <InboxIconGray />,
      name: "Inbox",
      href: `/${UNCATEGORIZED_URL}`,
      current: currentPath === UNCATEGORIZED_URL,
      id: 2,
      count: bookmarksCountData?.data?.uncategorized,
    },
    {
      icon: <TrashIconGray />,
      name: "Trash",
      href: `/${TRASH_URL}`,
      current: currentPath === TRASH_URL,
      id: 3,
      count: bookmarksCountData?.data?.trash,
    },
  ];

  const navBarLogo = () => {
    const currentCategory = find(
      categoryData?.data,
      item => item?.category_slug === currentPath,
    );

    if (currentCategory) {
      return find(
        options,
        item => item?.label === currentCategory?.icon,
      )?.icon();
    }
    return find(optionsMenuList, item => item?.current === true)?.icon;
  };

  const renderMainPaneNav = () => {
    return (
      <header className="flex items-center justify-between border-b-[0.5px] border-b-custom-gray-4 py-[9px] px-4">
        <div className="flex items-center space-x-[9px]">
          <figure className="flex h-5 w-5 items-center">{navBarLogo()}</figure>
          <p className="text-xl font-semibold leading-6 text-black">
            {find(
              categoryData?.data,
              item => item?.category_slug === currentPath,
            )?.category_name ||
              find(optionsMenuList, item => item?.current === true)?.name}
          </p>
        </div>
        <SearchInput
          userId={userId}
          placeholder={`Search in ${
            find(
              categoryData?.data,
              item => item?.category_slug === currentPath,
            )?.category_name || "All Bookmarks"
          }`}
          onChange={value => {
            setSearchText(value);
          }}
        />
        <div className="flex items-center">
          <div className="mr-[17px] flex items-center space-x-1">
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
            {typeof categoryId === "number" && (
              <Button
                type="light"
                onClick={() => onShareClick()}
                id="share-button"
              >
                <figure className="h-3 w-3">
                  <UserIconGray />
                </figure>
                <span className="ml-[7px] text-custom-gray-1">Share</span>
              </Button>
            )}
            <Menu as="div" className="relative shrink-0">
              <Menu.Button as="div">
                <Button type="light" className="p-[5px]" style={{ padding: 5 }}>
                  <figure className="h-4 w-4">
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
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                  <Menu.Item>
                    {({ active }) => (
                      <div
                        className={` cursor-pointer ${classNames(
                          active ? "bg-gray-100" : "",
                          "block py-2 px-4 text-sm text-gray-700",
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
            <figure className="h-3 w-3">
              <PlusIconWhite />
            </figure>
            <span className="ml-[7px] text-white">Add</span>
          </Button>
        </div>
      </header>
    );
  };
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {!showSidePane && (
        <Button
          className="absolute top-[64px] left-[12px] z-50 cursor-pointer bg-slate-200 shadow-2xl"
          onClick={() => setShowSidePane(true)}
        >
          <figure>
            <ChevronDoubleRightIcon className="h-4 w-4 shrink-0 text-gray-400" />
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
          className="transition-all duration-150 ease-in-out"
        >
          {showSidePane && (
            <SidePane
              onBookmarksDrop={onBookmarksDrop}
              onCategoryOptionClick={onCategoryOptionClick}
              onIconSelect={(value, id) => onIconSelect(value, id)}
              onAddNewCategory={onAddNewCategory}
            />
          )}
        </Allotment.Pane>
        <Allotment.Pane className="transition-all duration-150 ease-in-out">
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
