import { Menu, MenuButton, useMenuState } from 'ariakit/menu';
import SortByDateIconGray from '../../icons/sortByDateIconGray';
import { useBookmarkCardViewState } from '../../store/componentStore';
import { BookmarksSortByTypes } from '../../types/componentStoreTypes';
import Button from '../atoms/button';
import RadioGroup from '../radioGroup';

const BookmarksSortDropdown = () => {
  const sortBy = useBookmarkCardViewState((state) => state.sortBy);

  const setSortBy = useBookmarkCardViewState((state) => state.setSortBy);

  const menu = useMenuState({ gutter: 8 });

  const sortOptions = [
    {
      label: 'By date ↑',
      value: 'date-sort-acending',
    },
    {
      label: 'By date ↓',
      value: 'date-sort-decending',
    },
    {
      label: 'By Name (A → Z)',
      value: 'alphabetical-sort-acending',
    },
    {
      label: 'By name (Z → A)',
      value: 'alphabetical-sort-decending',
    },
    {
      label: 'By url (A → Z)',
      value: 'url-sort-acending',
    },
    {
      label: 'By url (Z → A)',
      value: 'url-sort-decending',
    },
  ];

  return (
    <>
      <MenuButton state={menu} className="button" as="div">
        <Button type="light">
          <figure className="w-3 h-3">
            <SortByDateIconGray />
          </figure>
          <span className="ml-[7px] text-custom-gray-1">By Date</span>
        </Button>
      </MenuButton>
      <Menu
        state={menu}
        className="w-[170px] py-3 px-1 origin-top-left rounded-xl bg-white shadow-custom-1 ring-1 ring-black ring-opacity-5 z-20"
      >
        <RadioGroup
          radioList={sortOptions}
          onChange={(value) => setSortBy(value as BookmarksSortByTypes)}
          value={sortBy}
        />
      </Menu>
    </>
  );
};

export default BookmarksSortDropdown;
