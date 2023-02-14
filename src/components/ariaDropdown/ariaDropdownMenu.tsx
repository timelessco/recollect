import { MenuItem } from "ariakit";

import type { ChildrenTypes } from "../../types/componentTypes";

interface AriaDropdownMenuTypes {
  onClick: () => void | Promise<void>;
  children: ChildrenTypes;
}

const AriaDropdownMenu = (props: AriaDropdownMenuTypes) => {
  const { onClick, children } = props;

  return (
    <MenuItem
      className="rounded-lg hover:bg-custom-gray-9 focus:bg-custom-gray-9 focus-visible:outline-none"
      onClick={onClick}
    >
      {children}
    </MenuItem>
  );
};

export default AriaDropdownMenu;
