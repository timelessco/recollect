import { Menu, MenuButton, useMenuState } from "ariakit/menu";
import { useEffect } from "react";

import type { ChildrenTypes } from "../../types/componentTypes";

interface AriaDropDownPropTypes {
  menuButton: ChildrenTypes;
  menuClassName?: string;
  menuButtonClassName?: string;
  menuOpenToggle?: (value: boolean) => void;
  children: ChildrenTypes;
}

const AriaDropDown = (props: AriaDropDownPropTypes) => {
  const menu = useMenuState({ gutter: 1 });
  const {
    menuButton,
    menuClassName,
    menuButtonClassName,
    menuOpenToggle = () => null,
    children,
  } = props;

  useEffect(() => {
    menuOpenToggle(menu?.open);
  }, [menu?.open, menuOpenToggle]);

  return (
    <>
      <MenuButton
        state={menu}
        className={`${menuButtonClassName || ""} focus-visible:outline-none`}
      >
        {menuButton}
      </MenuButton>
      <Menu
        state={menu}
        className={`${menuClassName || ""} focus-visible:outline-none`}
      >
        {children}
      </Menu>
    </>
  );
};

export default AriaDropDown;
