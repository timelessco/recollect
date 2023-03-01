import { Menu, MenuButton, useMenuState } from "ariakit/menu";
import { useEffect } from "react";

import type { ChildrenTypes } from "../../types/componentTypes";

interface AriaDropDownPropTypes {
  menuButton: ChildrenTypes;
  menuClassName?: string;
  menuButtonClassName?: string;
  menuButtonActiveClassName?: string;
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
    menuButtonActiveClassName, // we have this as a prop because i dont want to send menu state to button render prop
  } = props;

  useEffect(() => {
    menuOpenToggle(menu?.open);
  }, [menu?.open, menuOpenToggle]);

  return (
    <>
      <MenuButton
        state={menu}
        className={`${menuButtonClassName || ""} ${
          (menu.open && menuButtonActiveClassName) || ""
        } focus-visible:outline-none`}
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
