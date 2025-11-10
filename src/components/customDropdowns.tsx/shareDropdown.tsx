import { Menu, MenuButton, useMenuState } from "ariakit/menu";

import ShareIcon from "../../icons/shareIcon";
import { dropdownMenuItemClassName } from "../../utils/commonClassNames";
import Button from "../atoms/button";

const ShareDropdown = ({ renderOnlyButton = false }) => {
	const menu = useMenuState({ gutter: 8 });

	const buttonContent = (
		<div className={`flex ${dropdownMenuItemClassName}`}>
			<figure className="text-gray-1000 h-4 w-4">
				<ShareIcon />
			</figure>
			<span className="ml-[7px]">Share</span>
		</div>
	);

	if (renderOnlyButton) {
		return buttonContent;
	}

	return (
		<>
			<MenuButton as="div" className="outline-hidden" state={menu}>
				<Button
					id="share-button"
					isActive={menu.open}
					title="share"
					type="light"
					// onClick={() => onShareClick()}
				>
					{buttonContent}
				</Button>
			</MenuButton>
			<Menu
				// initialFocusRef={radioFocusRef}
				className="shadow-custom-1 z-20 w-[307px] origin-top-left rounded-xl bg-white p-[6px] ring-1 ring-black/5"
				state={menu}
			>
				{/* <ShareContent /> */}
			</Menu>
		</>
	);
};

export default ShareDropdown;
