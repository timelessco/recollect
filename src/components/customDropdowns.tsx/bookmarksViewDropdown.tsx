import { PostgrestError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, MenuButton, useMenuState } from 'ariakit/menu';
import { isEmpty } from 'lodash';
import find from 'lodash/find';
import React, { useRef } from 'react';
import MoodboardIconGray from '../../icons/moodboardIconGray';
import {
  CategoriesData,
  FetchSharedCategoriesData,
  ProfilesTableTypes,
} from '../../types/apiTypes';
import {
  BookmarksViewTypes,
  BookmarkViewCategories,
} from '../../types/componentStoreTypes';
import { CategoryIdUrlTypes } from '../../types/componentTypes';
import {
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  USER_PROFILE,
} from '../../utils/constants';
import { errorToast } from '../../utils/toastMessages';
import Button from '../atoms/button';
import Checkbox from '../checkbox';
import RadioGroup from '../radioGroup';
import Slider from '../slider';

interface BookmarksViewDropdownProps {
  setBookmarksView: (
    value: BookmarksViewTypes | string[] | number[],
    type: BookmarkViewCategories
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
    (item) => item?.id === categoryId
  );

  const isUserTheCategoryOwner = userId === currentCategory?.user_id?.id;

  const bookmarksInfoValue =
    categoryId !== null
      ? isUserTheCategoryOwner
        ? currentCategory?.category_views?.cardContentViewArray
        : !isEmpty(sharedCategoriesData?.data[0])
        ? sharedCategoriesData?.data[0]?.category_views?.cardContentViewArray
        : []
      : !isEmpty(userProfilesData?.data[0])
      ? userProfilesData?.data[0]?.bookmarks_view?.cardContentViewArray
      : [];

  const bookmarksColumns =
    categoryId !== null
      ? isUserTheCategoryOwner
        ? currentCategory?.category_views?.moodboardColumns
        : !isEmpty(sharedCategoriesData?.data[0])
        ? sharedCategoriesData?.data[0]?.category_views?.moodboardColumns
        : [10]
      : !isEmpty(userProfilesData?.data[0])
      ? userProfilesData?.data[0]?.bookmarks_view?.moodboardColumns
      : [10];

  const bookmarksViewValue =
    typeof categoryId === 'number'
      ? isUserTheCategoryOwner
        ? currentCategory?.category_views?.bookmarksView
        : !isEmpty(sharedCategoriesData?.data[0])
        ? sharedCategoriesData?.data[0]?.category_views?.bookmarksView
        : ''
      : !isEmpty(userProfilesData?.data[0])
      ? userProfilesData?.data[0]?.bookmarks_view?.bookmarksView
      : '';

  const cardContentOptions = [
    {
      label: 'Cover',
      value: 'cover',
    },
    {
      label: 'Title',
      value: 'title',
    },
    {
      label: 'Description',
      value: 'description',
    },
    {
      label: 'Tags',
      value: 'tags',
    },
    {
      label: 'Info',
      value: 'info',
    },
  ];

  const bookmarksViewOptions = [
    {
      label: 'Moodboard',
      value: 'moodboard',
    },
    {
      label: 'List',
      value: 'list',
    },
    {
      label: 'Card',
      value: 'card',
    },
    {
      label: 'Headlines',
      value: 'headlines',
    },
  ];
  const menu = useMenuState({ gutter: 8 });
  const radio0ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <MenuButton state={menu} className="" as="div">
        <Button type="light">
          <figure className="w-3 h-3">
            <MoodboardIconGray />
          </figure>
          <span className="ml-[7px] text-custom-gray-1">
            {
              find(
                bookmarksViewOptions,
                (item) => item?.value === bookmarksViewValue
              )?.label
            }
          </span>
        </Button>
      </MenuButton>
      <Menu
        initialFocusRef={radio0ref}
        state={menu}
        className="w-[170px] py-3 px-1 origin-top-left rounded-xl bg-white shadow-custom-1 ring-1 ring-black ring-opacity-5 z-20"
      >
        <div>
          <RadioGroup
            initialRadioRef={radio0ref}
            radioList={bookmarksViewOptions}
            onChange={(value) =>
              setBookmarksView(value as BookmarksViewTypes, 'view')
            }
            value={bookmarksViewValue || ''}
          />
        </div>
        <div>
          {cardContentOptions?.map((item) => {
            return (
              <Checkbox
                disabled={bookmarksViewValue === 'headlines'}
                key={item?.value}
                label={item?.label}
                value={item?.value}
                checked={bookmarksInfoValue?.includes(item?.value) || false}
                onChange={(value) => {
                  if (bookmarksInfoValue?.includes(value as string)) {
                    if (bookmarksInfoValue?.length > 1) {
                      // setCardContentViewArray(
                      //   bookmarksInfoValue?.filter((item) => item !== value)
                      // );
                      setBookmarksView(
                        bookmarksInfoValue?.filter((item) => item !== value),
                        'info'
                      );
                    } else {
                      errorToast('Atleast one view option needs to be selcted');
                    }
                  } else {
                    // setCardContentViewArray([
                    //   ...bookmarksInfoValue,
                    //   value as string,
                    // ]);
                    setBookmarksView(
                      [...(bookmarksInfoValue as string[]), value as string],
                      'info'
                    );
                  }
                }}
              />
            );
          })}
        </div>

        {bookmarksViewValue === 'card' || bookmarksViewValue === 'moodboard' ? (
          <div className="p-2">
            <Slider
              label="moodboard-cols-slider"
              minValue={10}
              maxValue={50}
              step={10}
              value={bookmarksColumns}
              // onChange={(value) => setMoodboardColumns(value)}
              onChange={(value) =>
                setBookmarksView(value as number[], 'colums')
              }
            />
          </div>
        ) : (
          <div className="w-[162px] h-[34px]" />
        )}
      </Menu>
    </>
  );
};

export default BookmarksViewDropdown;
