import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, MenuButton, useMenuState } from "ariakit/menu";
import { isEmpty } from "lodash";
import find from "lodash/find";
import React, { useRef } from "react";

import CardIcon from "../../icons/viewIcons/cardIcon";
import HeadlinesIcon from "../../icons/viewIcons/headLinesIcon";
import ListIcon from "../../icons/viewIcons/listIcon";
import MoodboardIconGray from "../../icons/viewIcons/moodboardIconGray";
import type {
  CategoriesData,
  FetchSharedCategoriesData,
  ProfilesTableTypes,
} from "../../types/apiTypes";
import type {
  BookmarksViewTypes,
  BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import type { CategoryIdUrlTypes } from "../../types/componentTypes";
import {
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  TRASH_URL,
  UNCATEGORIZED_URL,
  USER_PROFILE,
} from "../../utils/constants";
import { errorToast } from "../../utils/toastMessages";
import Button from "../atoms/button";
// import Checkbox from "../checkbox";
import RadioGroup from "../radioGroup";
import Slider from "../slider";
import Switch from "../switch";

interface BookmarksViewDropdownProps {
  setBookmarksView: (
    value: BookmarksViewTypes | string[] | number[],
    type: BookmarkViewCategories,
  ) => void;
  categoryId: CategoryIdUrlTypes;
  userId: string;
}

const BookmarksViewDropdown = (props: BookmarksViewDropdownProps) => {
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

  const sharedCategoriesData = queryClient.getQueryData([
    SHARED_CATEGORIES_TABLE_NAME,
  ]) as {
    data: FetchSharedCategoriesData[];
    error: PostgrestError;
  };

  const currentCategory = find(
    categoryData?.data,
    item => item?.id === categoryId,
  );

  const isUserTheCategoryOwner = userId === currentCategory?.user_id?.id;

  const getViewValue = (
    viewType: "cardContentViewArray" | "moodboardColumns" | "bookmarksView",
    defaultReturnValue: [] | string | [number],
  ) => {
    if (categoryId !== null) {
      // TODO: change this into array check
      if (categoryId === UNCATEGORIZED_URL || categoryId === TRASH_URL) {
        return userProfilesData?.data[0]?.bookmarks_view?.[viewType];
      }

      if (isUserTheCategoryOwner) {
        return currentCategory?.category_views?.[viewType];
      }
      if (!isEmpty(sharedCategoriesData?.data)) {
        return sharedCategoriesData?.data[0]?.category_views?.[viewType];
      }
      return defaultReturnValue;
    }
    if (!isEmpty(userProfilesData?.data)) {
      return userProfilesData?.data[0]?.bookmarks_view?.[viewType];
    }
    return defaultReturnValue;
  };

  const bookmarksInfoValue = getViewValue("cardContentViewArray", []) as [];
  const bookmarksColumns = getViewValue("moodboardColumns", [10]);
  const bookmarksViewValue = getViewValue("bookmarksView", "");

  // const bookmarksInfoValue =
  //   categoryId !== null
  //     ? isUserTheCategoryOwner
  //       ? currentCategory?.category_views?.cardContentViewArray
  // isEmpty(sharedCategoriesData?.data[0])
  //       ? sharedCategoriesData?.data[0]?.category_views?.cardContentViewArray
  //       : []
  //     : !isEmpty(userProfilesData?.data[0])
  //     ? userProfilesData?.data[0]?.bookmarks_view?.cardContentViewArray
  //     : [];

  // const bookmarksColumns =
  //   categoryId !== null
  //     ? isUserTheCategoryOwner
  //       ? currentCategory?.category_views?.moodboardColumns
  //       : !isEmpty(sharedCategoriesData?.data[0])
  //       ? sharedCategoriesData?.data[0]?.category_views?.moodboardColumns
  //       : [10]
  //     : !isEmpty(userProfilesData?.data[0])
  //     ? userProfilesData?.data[0]?.bookmarks_view?.moodboardColumns
  //     : [10];

  // const bookmarksViewValue =
  //   typeof categoryId === "number"
  //     ? isUserTheCategoryOwner
  //       ? currentCategory?.category_views?.bookmarksView
  //       : !isEmpty(sharedCategoriesData?.data[0])
  //       ? sharedCategoriesData?.data[0]?.category_views?.bookmarksView
  //       : ""
  //     : !isEmpty(userProfilesData?.data[0])
  //     ? userProfilesData?.data[0]?.bookmarks_view?.bookmarksView
  //     : "";

  interface CardContentOptionsTypes {
    label: string;
    value: string;
  }
  const cardContentOptions: CardContentOptionsTypes[] = [
    {
      label: "Cover",
      value: "cover",
    },
    {
      label: "Title",
      value: "title",
    },
    {
      label: "Description",
      value: "description",
    },
    {
      label: "Tags",
      value: "tags",
    },
    {
      label: "Info",
      value: "info",
    },
  ];

  const bookmarksViewOptions = [
    {
      label: "Moodboard",
      value: "moodboard",
      icon: <MoodboardIconGray />,
    },
    {
      label: "List",
      value: "list",
      icon: <ListIcon />,
    },
    {
      label: "Card",
      value: "card",
      icon: <CardIcon />,
    },
    {
      label: "Headlines",
      value: "headlines",
      icon: <HeadlinesIcon />,
    },
  ];
  const menu = useMenuState({ gutter: 8 });
  const radio0ref = useRef<HTMLInputElement>(null);

  const renderDropdownHeader = (text: string) => {
    return (
      <div className="py-[6px] px-2 text-xs font-450 leading-[14px] text-custom-gray-10">
        {text}
      </div>
    );
  };

  const renderViewsSwitch = (item: CardContentOptionsTypes) => {
    return (
      <div className="flex items-center justify-between px-2 py-[5px]">
        <p className=" text-13 font-450 leading-[14px] text-custom-gray-1">
          {item?.label}
        </p>
        <Switch
          size="small"
          disabled={bookmarksViewValue === "headlines"}
          enabled={bookmarksInfoValue?.includes(item?.value as never) || false}
          setEnabled={() => {
            if (bookmarksInfoValue?.includes(item.value as never)) {
              if (bookmarksInfoValue?.length > 1) {
                setBookmarksView(
                  bookmarksInfoValue?.filter(
                    viewItem => viewItem !== item.value,
                  ),
                  "info",
                );
              } else {
                errorToast("Atleast one view option needs to be selcted");
              }
            } else {
              setBookmarksView(
                [...(bookmarksInfoValue as string[]), item.value],
                "info",
              );
            }
          }}
        />
      </div>
    );
  };

  return (
    <>
      <MenuButton state={menu} as="div">
        <Button type="light" isActive={menu.open}>
          <figure className="h-4 w-4">
            {/* <MoodboardIconGray /> */}
            {
              find(
                bookmarksViewOptions,
                item => item?.value === bookmarksViewValue,
              )?.icon
            }
          </figure>
          <span className="ml-[7px] text-custom-gray-1">
            {
              find(
                bookmarksViewOptions,
                item => item?.value === bookmarksViewValue,
              )?.label
            }
          </span>
        </Button>
      </MenuButton>
      <Menu
        initialFocusRef={radio0ref}
        state={menu}
        className="z-20 w-[195px] origin-top-left rounded-xl bg-white px-[6px] pt-[6px] pb-3 shadow-custom-1 ring-1 ring-black/5"
      >
        {renderDropdownHeader("View as")}
        <div>
          <RadioGroup
            initialRadioRef={radio0ref}
            radioList={bookmarksViewOptions}
            onChange={value =>
              setBookmarksView(value as BookmarksViewTypes, "view")
            }
            value={bookmarksViewValue as string}
          />
        </div>
        {renderDropdownHeader("Show in Cards")}
        <div>
          {cardContentOptions?.map(item => {
            // return (
            //   <Checkbox
            //     disabled={bookmarksViewValue === "headlines"}
            //     key={item?.value}
            //     label={item?.label}
            //     value={item?.value}
            // checked={
            //   bookmarksInfoValue?.includes(item?.value as never) || false
            // }
            // onChange={value => {
            //   if (bookmarksInfoValue?.includes(value as never)) {
            //     if (bookmarksInfoValue?.length > 1) {
            //       setBookmarksView(
            //         bookmarksInfoValue?.filter(
            //           viewItem => viewItem !== value,
            //         ),
            //         "info",
            //       );
            //     } else {
            //       errorToast("Atleast one view option needs to be selcted");
            //     }
            //   } else {
            //     setBookmarksView(
            //       [...(bookmarksInfoValue as string[]), value as string],
            //       "info",
            //     );
            //   }
            // }}
            //   />
            // );
            return renderViewsSwitch(item);
          })}
        </div>

        {bookmarksViewValue === "card" || bookmarksViewValue === "moodboard" ? (
          <div className="flex items-center justify-between py-[4.5px] px-2">
            <p className="text-13 font-450 leading-[14px] text-custom-gray-1">
              Cover size
            </p>
            <div className="w-[90px]">
              <Slider
                label="moodboard-cols-slider"
                minValue={10}
                maxValue={50}
                step={10}
                value={bookmarksColumns as unknown as number}
                // value={20}
                // onChange={(value) => setMoodboardColumns(value)}
                onChange={value =>
                  setBookmarksView(value as number[], "colums")
                }
              />
            </div>
          </div>
        ) : (
          <div className="h-[34px] w-[162px]" />
        )}
      </Menu>
    </>
  );
};

export default BookmarksViewDropdown;
