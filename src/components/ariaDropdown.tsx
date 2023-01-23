import { Menu, MenuButton, MenuItem, useMenuState } from 'ariakit/menu';
import { ChildrenTypes } from '../types/componentTypes';

type OptionType = { label: string; value: string | number };
interface AriaDropDownPropTypes {
  renderMenuButton: () => ChildrenTypes;
  options: OptionType[];
  renderSingleMenuItem: (value: OptionType) => ChildrenTypes;
  menuClassName: string;
  onOptionClick: (value: string | number) => void;
}

const AriaDropDown = (props: AriaDropDownPropTypes) => {
  const menu = useMenuState({ gutter: 1 });

  const {
    renderMenuButton,
    options,
    renderSingleMenuItem,
    menuClassName,
    onOptionClick,
  } = props;

  return (
    <>
      <MenuButton state={menu} className="w-full">
        {renderMenuButton()}
      </MenuButton>
      <Menu state={menu} className={menuClassName}>
        {options?.map((item) => (
          <MenuItem
            key={item?.value}
            className=" focus:bg-custom-gray-9 hover:bg-custom-gray-9 rounded-lg"
            onClick={() => onOptionClick(item?.value)}
          >
            {renderSingleMenuItem(item)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default AriaDropDown;
