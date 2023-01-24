import { MenuItem } from 'ariakit';
import { ChildrenTypes } from '../../types/componentTypes';

interface AriaDropdownMenuTypes {
  onClick: () => void;
  children: ChildrenTypes;
}

const AriaDropdownMenu = (props: AriaDropdownMenuTypes) => {
  const { onClick, children } = props;

  return (
    <MenuItem
      className="focus:bg-custom-gray-9 hover:bg-custom-gray-9 rounded-lg focus-visible:outline-none"
      onClick={onClick}
    >
      {children}
    </MenuItem>
  );
};

export default AriaDropdownMenu;
