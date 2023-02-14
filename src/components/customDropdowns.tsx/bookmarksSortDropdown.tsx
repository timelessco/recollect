import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, MenuButton, useMenuState } from "ariakit/menu";
import { isEmpty } from "lodash";
import find from "lodash/find";
import { useRef } from "react";

import SortByDateIconGray from "../../icons/sortByDateIconGray";
import { useLoadersStore } from "../../store/componentStore";
import type { CategoriesData, ProfilesTableTypes } from "../../types/apiTypes";
import type {
  BookmarksSortByTypes,
  BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import type { CategoryIdUrlTypes } from "../../types/componentTypes";
import { CATEGORIES_KEY, USER_PROFILE } from "../../utils/constants";
import Button from "../atoms/button";
import RadioGroup from "../radioGroup";
import Spinner from "../spinner";

interface BookmarksSortDropdownTypes {
  setBookmarksView: (
    value: BookmarksSortByTypes,
    type: BookmarkViewCategories,
  ) => void;
  categoryId: CategoryIdUrlTypes;
  userId: string;
}

const BookmarksSortDropdown = (props: BookmarksSortDropdownTypes) => {
  const { setBookmarksView, categoryId, userId } = props;

  const queryClient = useQueryClient();

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
    data: ProfilesTableTypes[];
    error: PostgrestError;
  };

  const isSortByLoading = useLoadersStore(state => state.isSortByLoading);

  const currentCategory = find(
    categoryData?.data,
    item => item?.id === categoryId,
  );

  const isInNonCategoryPage = typeof categoryId !== "number";

  const getSortValue = () => {
    if (!isInNonCategoryPage) {
      return currentCategory?.category_views?.sortBy;
    }
    if (!isEmpty(userProfilesData?.data)) {
      return userProfilesData?.data[0]?.bookmarks_view?.sortBy as string;
    }
    return "";
  };

  const bookmarksSortValue = getSortValue();

  const menu = useMenuState({ gutter: 8 });

  const sortOptions = [
    {
      label: "By date ↑",
      value: "date-sort-acending",
    },
    {
      label: "By date ↓",
      value: "date-sort-decending",
    },
    {
      label: "By Name (A → Z)",
      value: "alphabetical-sort-acending",
    },
    {
      label: "By name (Z → A)",
      value: "alphabetical-sort-decending",
    },
    {
      label: "By url (A → Z)",
      value: "url-sort-acending",
    },
    {
      label: "By url (Z → A)",
      value: "url-sort-decending",
    },
  ];

  const radioFocusRef = useRef(null);
  return (
    <>
      {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
      <MenuButton state={menu} className="button" as="div">
        <Button type="light">
          <figure className="h-3 w-3">
            {isSortByLoading ? <Spinner /> : <SortByDateIconGray />}
          </figure>
          <span className="ml-[7px] text-custom-gray-1">
            {
              find(sortOptions, item => item?.value === bookmarksSortValue)
                ?.label
            }
          </span>
        </Button>
      </MenuButton>
      <Menu
        initialFocusRef={radioFocusRef}
        state={menu}
        className="z-20 w-[170px] origin-top-left rounded-xl bg-white py-3 px-1 shadow-custom-1 ring-1 ring-black/5"
      >
        <RadioGroup
          radioList={sortOptions}
          onChange={value =>
            setBookmarksView(value as BookmarksSortByTypes, "sort")
          }
          value={bookmarksSortValue || ""}
          initialRadioRef={radioFocusRef}
        />
      </Menu>
    </>
  );
};

export default BookmarksSortDropdown;
