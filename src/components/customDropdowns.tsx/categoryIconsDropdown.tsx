import {
  Combobox,
  ComboboxItem,
  ComboboxList,
  ComboboxRow,
  useComboboxState,
} from "ariakit/combobox";
import { Menu, MenuButton, useMenuState } from "ariakit/menu";
import { find } from "lodash";

import SearchIconSmallGray from "../../icons/searchIconSmallGray";
import { options } from "../../utils/commonData";

interface CategoryIconsDropdownTypes {
  onIconSelect: (value: string) => void;
  iconValue: string | null;
}

const CategoryIconsDropdown = (props: CategoryIconsDropdownTypes) => {
  const { onIconSelect, iconValue } = props;

  const defaultList = options?.map(item => item?.label);

  const combobox = useComboboxState({
    defaultList,
  });
  const menu = useMenuState(combobox);

  // Resets combobox value when menu is closed
  if (!menu.mounted && combobox.value) {
    combobox.setValue("");
  }

  const renderItem = (value: string) => {
    const data = find(options, item => item?.label === value);

    return (
      <div title={data?.label} className="h-[18px] w-[18px]">
        {data?.icon()}
      </div>
    );
  };

  const renderComboBoxItem = (value: string, i: number) => {
    return (
      <ComboboxItem
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        key={value + i}
        value={value}
        focusOnHover
        setValueOnClick={false}
        className="data-active-item:bg-custom-gray-7 rounded-md p-1 hover:bg-custom-gray-7"
        onClick={() => onIconSelect(value)}
      >
        {renderItem(value)}
      </ComboboxItem>
    );
  };

  return (
    <>
      <MenuButton state={menu}>
        {find(options, item => item?.label === iconValue)?.icon()}
      </MenuButton>
      <Menu
        state={menu}
        composite={false}
        className="absolute left-4 z-10 mt-2 w-[319px] origin-top-left rounded-xl bg-white px-3 shadow-custom-1 ring-1 ring-black/5 focus:outline-none"
      >
        <div className="flex items-center justify-between border-b-[1px] border-b-custom-gray-7 py-3">
          <span className="text-sm font-medium leading-4 text-custom-gray-1">
            Choose an icon
          </span>
          <div className="flex w-[139px] items-center rounded-lg bg-custom-gray-6 py-[7px] px-[10px]">
            <figure className="mr-[6px] h-3 w-3">
              <SearchIconSmallGray />
            </figure>
            <Combobox
              state={combobox}
              // eslint-disable-next-line jsx-a11y/aria-role
              role="gird"
              autoSelect
              placeholder="Search..."
              className="w-[101px] bg-custom-gray-6 text-sm font-normal leading-4 text-custom-gray-3 focus:outline-none"
            />
          </div>
        </div>
        <ComboboxList state={combobox} className="flex flex-col pt-2 pb-3">
          <ComboboxRow className="flex space-x-3">
            {combobox.matches.map((values, i) => renderComboBoxItem(values, i))}
          </ComboboxRow>
          {/* <ComboboxRow>
            {renderComboBoxItem(combobox.matches[0])}
            {renderComboBoxItem(combobox.matches[1])}
          </ComboboxRow> */}
        </ComboboxList>
      </Menu>
    </>
  );
};

export default CategoryIconsDropdown;
