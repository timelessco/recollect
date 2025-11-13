import { type RefObject } from "react";
import { Menu, MenuButton, useMenuState } from "ariakit/menu";

import { type ChildrenTypes } from "../../types/componentTypes";

type AriaDropDownPropertyTypes = {
	children: ChildrenTypes;
	// the element you want to focus when the menu opens
	initialFocusRef?: RefObject<HTMLElement | null> | undefined;
	isOpen?: boolean;
	menuButton: ChildrenTypes;
	menuButtonActiveClassName?: string;
	menuButtonClassName?: string;
	menuClassName?: string;
	menuOpenToggle?: (value: boolean) => void;
	onButtonClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

const AriaDropDown = (props: AriaDropDownPropertyTypes) => {
	const menu = useMenuState({
		gutter: 1,
		open: props.isOpen,
		setOpen: (value) => menuOpenToggle(value),
	});
	const {
		menuButton,
		menuClassName,
		menuButtonClassName,
		menuOpenToggle = () => null,
		children,

		// we have this as a prop because i dont want to send menu state to button render prop
		menuButtonActiveClassName,
		onButtonClick = () => null,
	} = props;

	return (
		<>
			<MenuButton
				className={`${menuButtonClassName ?? ""} ${
					(menu.open && menuButtonActiveClassName) ?? ""
				} focus-visible:outline-hidden`}
				onClick={onButtonClick}
				state={menu}
			>
				{menuButton}
			</MenuButton>
			<Menu
				className={`${menuClassName ?? ""} leading-[20px] focus-visible:outline-hidden`}
				// @ts-expect-error - TODO: fix this
				initialFocusRef={props.initialFocusRef}
				state={menu}
				portal
			>
				{children}
			</Menu>
		</>
	);
};

export default AriaDropDown;
