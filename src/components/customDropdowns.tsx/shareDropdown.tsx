import { Menu, MenuButton, useMenuState } from "ariakit/menu";

import ShareIcon from "../../icons/shareIcon";
import ShareContent from "../../pageComponents/dashboard/share/shareContent";
import Button from "../atoms/button";

const ShareDropdown = () => {
  const menu = useMenuState({ gutter: 8 });
  return (
    <>
      <MenuButton state={menu} as="div" className="outline-none">
        <Button
          type="light"
          // onClick={() => onShareClick()}
          id="share-button"
          isActive={menu.open}
        >
          <figure className="h-4 w-4">
            <ShareIcon />
          </figure>
          <span className="ml-[7px] text-custom-gray-1">Share</span>
        </Button>
      </MenuButton>
      <Menu
        // initialFocusRef={radioFocusRef}
        state={menu}
        className="z-20 w-[307px] origin-top-left rounded-xl bg-white p-[6px] shadow-custom-1 ring-1 ring-black/5"
      >
        <ShareContent />
      </Menu>
    </>
  );
};

export default ShareDropdown;
