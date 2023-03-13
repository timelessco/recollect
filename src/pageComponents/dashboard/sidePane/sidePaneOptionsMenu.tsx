import { useSession } from "@supabase/auth-helpers-react";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import HomeIconGray from "../../../icons/homeIconGray";
import InboxIconGray from "../../../icons/inboxIconGray";
import SearchIconGray from "../../../icons/searchIconGray";
import SettingsIcon from "../../../icons/settingsIcon";
import TrashIconGray from "../../../icons/trashIconGray";
import type { BookmarksCountTypes } from "../../../types/apiTypes";
import {
  ALL_BOOKMARKS_URL,
  BOOKMARKS_COUNT_KEY,
  SEARCH_URL,
  SETTINGS_URL,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from "../../../utils/constants";

import SingleListItemComponent from "./singleListItemComponent";

const SidePaneOptionsMenu = () => {
  const currentPath = useGetCurrentUrlPath();
  const queryClient = useQueryClient();
  const session = useSession();
  const SingleListItem = useCallback(SingleListItemComponent, []);

  const bookmarksCountData = queryClient.getQueryData([
    BOOKMARKS_COUNT_KEY,
    session?.user?.id,
  ]) as {
    data: BookmarksCountTypes;
    error: PostgrestError;
  };

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
      icon: <InboxIconGray />,
      name: "Inbox",
      href: `/${UNCATEGORIZED_URL}`,
      current: currentPath === UNCATEGORIZED_URL,
      id: 2,
      count: bookmarksCountData?.data?.uncategorized,
    },
    {
      icon: <HomeIconGray />,
      name: "All",
      href: `/${ALL_BOOKMARKS_URL}`,
      current: currentPath === ALL_BOOKMARKS_URL,
      id: 1,
      count: bookmarksCountData?.data?.allBookmarks,
    },

    {
      icon: <TrashIconGray />,
      name: "Trash",
      href: `/${TRASH_URL}`,
      current: currentPath === TRASH_URL,
      id: 3,
      count: bookmarksCountData?.data?.trash,
    },
    {
      icon: <SettingsIcon />,
      name: "Settings",
      href: `/${SETTINGS_URL}`,
      current: currentPath === SETTINGS_URL,
      id: 4,
      count: undefined,
    },
  ];

  return (
    <div className="pt-[10px]">
      {optionsMenuList?.map(item => {
        return (
          <SingleListItem
            extendedClassname="py-[6px]"
            key={item.id}
            item={item}
            showIconDropdown={false}
          />
        );
      })}
    </div>
  );
};

export default SidePaneOptionsMenu;
