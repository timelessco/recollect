import { Menu, MenuButton, useMenuState } from 'ariakit/menu';
import React from 'react';
import MoodboardIconGray from '../../icons/moodboardIconGray';
import { useBookmarkCardViewState } from '../../store/componentStore';
import { errorToast } from '../../utils/toastMessages';
import Button from '../atoms/button';
import Checkbox from '../checkbox';
import Slider from '../slider';

const BookmarksViewDropdown = () => {
  const moodboardColumns = useBookmarkCardViewState(
    (state) => state.moodboardColumns
  );

  const setMoodboardColumns = useBookmarkCardViewState(
    (state) => state.setMoodboardColumns
  );

  const cardContentViewArray = useBookmarkCardViewState(
    (state) => state.cardContentViewArray
  );

  const setCardContentViewArray = useBookmarkCardViewState(
    (state) => state.setCardContentViewArray
  );

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

  const menu = useMenuState({ gutter: 8 });
  return (
    <>
      <MenuButton state={menu} className="button" as="div">
        <Button type="light">
          <figure className="w-3 h-3">
            <MoodboardIconGray />
          </figure>
          <span className="ml-[7px] text-custom-gray-1">Moodboard</span>
        </Button>
      </MenuButton>
      <Menu
        state={menu}
        className="w-[170px] py-3 px-1 origin-top-left rounded-xl bg-white shadow-custom-1 ring-1 ring-black ring-opacity-5 z-20"
      >
        {cardContentOptions?.map((item) => {
          return (
            <Checkbox
              key={item?.value}
              label={item?.label}
              value={item?.value}
              checked={cardContentViewArray?.includes(item?.value)}
              onChange={(value) => {
                if (cardContentViewArray?.includes(value as string)) {
                  if (cardContentViewArray?.length > 1) {
                    setCardContentViewArray(
                      cardContentViewArray?.filter((item) => item !== value)
                    );
                  } else {
                    errorToast('Atleast one view option needs to be selcted');
                  }
                } else {
                  setCardContentViewArray([
                    ...cardContentViewArray,
                    value as string,
                  ]);
                }
              }}
            />
          );
        })}
        <div className="p-2">
          <Slider
            label="moodboard-cols-slider"
            minValue={10}
            maxValue={50}
            step={10}
            value={moodboardColumns}
            onChange={(value) => setMoodboardColumns(value)}
          />
        </div>
      </Menu>
    </>
  );
};

export default BookmarksViewDropdown;
