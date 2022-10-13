import SearchIconSmallGray from '../../icons/searchIconSmallGray';
import { find } from 'lodash';
import { options } from '../../utils/commonData';
import {
  Combobox,
  ComboboxItem,
  ComboboxList,
  useComboboxState,
  ComboboxRow,
} from 'ariakit/combobox';
import { Menu, MenuButton, useMenuState } from 'ariakit/menu';

interface CategoryIconsDropdownTypes {
  onIconSelect: (value: string) => void;
  iconValue: string | null;
}

export default function CategoryIconsDropdown(
  props: CategoryIconsDropdownTypes
) {
  const { onIconSelect, iconValue } = props;

  const defaultList = options?.map((item) => item?.label);

  const combobox = useComboboxState({
    defaultList,
  });
  const menu = useMenuState(combobox);

  // Resets combobox value when menu is closed
  if (!menu.mounted && combobox.value) {
    combobox.setValue('');
  }

  const renderItem = (value: string) => {
    const data = find(options, (item) => item?.label === value);

    return <div title={data?.label}>{data?.icon()}</div>;
  };

  const renderComboBoxItem = (value: string, i: number) => {
    return (
      <ComboboxItem
        key={value + i}
        value={value}
        focusOnHover
        setValueOnClick={false}
        className="p-1 rounded-md hover:bg-custom-gray-7 data-active-item:bg-custom-gray-7"
        onClick={() => onIconSelect(value)}
      >
        {renderItem(value)}
      </ComboboxItem>
    );
  };

  return (
    <>
      <MenuButton state={menu}>
        {find(options, (item) => item?.label === iconValue)?.icon()}
      </MenuButton>
      <Menu
        state={menu}
        composite={false}
        className="absolute px-3 left-4 z-10 mt-2 w-[319px] origin-top-left rounded-xl bg-white shadow-custom-1 ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <div className="py-3 flex items-center justify-between border-b-custom-gray-7 border-b-[1px]">
          <span className="text-custom-gray-1 text-sm leading-4 font-medium">
            Choose an icon
          </span>
          <div className="flex items-center py-[7px] px-[10px] bg-custom-gray-6 w-[139px] rounded-lg">
            <figure className="w-3 h-3 mr-[6px]">
              <SearchIconSmallGray />
            </figure>
            <Combobox
              state={combobox}
              role="gird"
              autoSelect
              placeholder="Search..."
              className="w-[101px] bg-custom-gray-6 text-custom-gray-3 font-normal text-sm leading-4 focus:outline-none"
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
}
