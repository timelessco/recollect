// this code is got from the aria kit doc, we are not going to override this for this eslint issues
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import * as React from "react";
import { flushSync } from "react-dom";
import * as Ariakit from "@ariakit/react";
import classNames from "classnames";
import { isNull } from "lodash";

import useGetCurrentUrlPath from "../../hooks/useGetCurrentUrlPath";
import { useMiscellaneousStore } from "../../store/componentStore";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../utils/commonClassNames";
import { TRASH_URL } from "../../utils/constants";

type MenuButtonProps = React.ComponentPropsWithRef<"div"> & {};
type MenuContextProps = {
	getMenu: () => HTMLElement | null;
	getOffsetRight: () => number;
	getWrapper: () => HTMLElement | null;
};

const MenuContext = React.createContext<MenuContextProps | null>(null);

export type MenuProps = React.ComponentPropsWithoutRef<"div"> & {
	disabled?: boolean;
	onClose?: () => void;
	renderButton: React.ReactNode;
};

const menuItemClassName = `flex w-full ${dropdownMenuItemClassName}`;

export const Menu = React.forwardRef<HTMLDivElement, MenuProps>(
	({ renderButton, children, onClose = () => null, ...props }, ref) => {
		const parent = React.useContext(MenuContext);
		const isSubmenu = Boolean(parent);

		const menu = Ariakit.useMenuStore({
			placement: isSubmenu ? "right-start" : "bottom-start",
			animated: isSubmenu ? 500 : false,
		});

		const open = menu.useState("open");

		React.useEffect(() => {
			if (open === false) {
				onClose();
			}
		}, [open, onClose]);

		const autoFocusOnShow = menu.useState("autoFocusOnShow");

		// By default, submenus don't automatically receive focus when they open.
		// But here we want them to always receive focus.
		React.useLayoutEffect(() => {
			if (!autoFocusOnShow) {
				menu.setAutoFocusOnShow(true);
			}
		}, [autoFocusOnShow, menu]);

		// We only want to delay hiding the menu, so we immediately stop the
		// animation when it's opening.
		React.useLayoutEffect(() => {
			if (open) {
				menu.stopAnimation();
			}
		}, [open, menu]);

		const contextValue = React.useMemo<MenuContextProps>(
			() => ({
				getWrapper: () =>
					parent?.getWrapper() || menu.getState().popoverElement,
				getMenu: () => menu.getState().baseElement,
				getOffsetRight: () =>
					(parent?.getOffsetRight() ?? 0) +
					(menu.getState().baseElement?.offsetWidth ?? 0),
			}),
			[menu, parent],
		);

		// Hide the submenu when it's not visible on scroll.
		React.useEffect(() => {
			if (!parent) return;
			const parentWrapper = parent.getWrapper();
			if (!parentWrapper) return;
			let timeout = 0;
			const onScroll = () => {
				clearTimeout(timeout);
				timeout = window.setTimeout(() => {
					// In right-to-left layouts, scrollLeft is negative.
					const scrollLeft = Math.abs(parentWrapper.scrollLeft);
					const wrapperOffset = scrollLeft + parentWrapper.clientWidth;
					if (wrapperOffset <= parent.getOffsetRight()) {
						// Since the submenu is not visible anymore at this point, we want
						// to hide it completely right away. That's why we synchronously
						// hide it and immediately stops the animation so it's completely
						// unmounted.
						flushSync(menu.hide);
						menu.stopAnimation();
					}
				}, 100);
			};

			parentWrapper.addEventListener("scroll", onScroll);

			// disabling this as we need to remove the event listener
			// eslint-disable-next-line consistent-return
			return () => parentWrapper.removeEventListener("scroll", onScroll);
		}, [parent, menu.hide, menu.stopAnimation, menu]);

		const renderMenuButton = (menuButtonProps: MenuButtonProps) => (
			<Ariakit.MenuButton
				// className="button"
				render={<button type="button" />}
				showOnHover={false}
				store={menu}
				{...menuButtonProps}
			>
				<span className="label">{renderButton}</span>
				{/* <Ariakit.MenuButtonArrow /> */}
			</Ariakit.MenuButton>
		);

		const wrapperProps = {
			// This is necessary so Chrome scrolls the submenu into view.
			style: { left: "auto" },
			// className: !isSubmenu ? "menu-wrapper" : "",
			className: !isSubmenu ? "menu-wrapper" : "",
		};

		const autoFocus = (element: HTMLElement) => {
			if (!isSubmenu) return true;
			element.focus({ preventScroll: true });
			element.scrollIntoView({ block: "nearest", inline: "start" });
			return false;
		};

		const setCurrentSliderDropdownSlide = useMiscellaneousStore(
			(state) => state.setCurrentSliderDropdownSlide,
		);

		const currentSliderDropdownSlide = useMiscellaneousStore(
			(state) => state.currentSliderDropdownSlide,
		);

		const currentPath = useGetCurrentUrlPath();

		// The height cannot change using css as the aria kit implementation does not allow so
		// to fix this issue we are maintaining a state which remembers where the user is in the slider menu
		// depending on this we are updating the dropdowns height
		const menuClassName = classNames({
			"z-10": true,
			[dropdownMenuClassName]: true,
			"h-[115px]":
				isNull(currentSliderDropdownSlide) && currentPath !== TRASH_URL,
			"h-[86px]":
				isNull(currentSliderDropdownSlide) && currentPath === TRASH_URL,
			"h-[365px]": currentSliderDropdownSlide === "view",
			"h-[133px]": currentSliderDropdownSlide === "sort",
		});

		return (
			<>
				{isSubmenu ? (
					// If it's a submenu, we have to combine the MenuButton and the
					// MenuItem components into a single component, so it works as a
					// submenu button.
					<Ariakit.MenuItem
						// className="menu-item"
						className={menuItemClassName}
						focusOnHover={false}
						ref={ref}
						{...props}
						render={renderMenuButton}
					/>
				) : (
					// Otherwise, we just render the menu button.
					renderMenuButton({ ref, ...props })
				)}
				<Ariakit.Menu
					autoFocusOnHide={autoFocus}
					autoFocusOnShow={autoFocus}
					className={menuClassName}
					flip={!isSubmenu}
					getAnchorRect={(anchor) =>
						parent?.getMenu()?.getBoundingClientRect() ||
						anchor?.getBoundingClientRect() ||
						null
					}
					gutter={isSubmenu ? 0 : 8}
					overflowPadding={isSubmenu ? 0 : 8}
					portal={isSubmenu}
					portalElement={parent?.getWrapper}
					store={menu}
					unmountOnHide
					wrapperProps={wrapperProps}
				>
					<MenuContext.Provider value={contextValue}>
						{isSubmenu && (
							<>
								<div
									// className="header"
									className=" flex items-center justify-between p-1"
								>
									<Ariakit.MenuItem
										aria-label="Back to parent menu"
										focusOnHover={false}
										hideOnClick={false}
										onClick={() => {
											menu.hide();
											setCurrentSliderDropdownSlide(null);
										}}
										render={<button type="button" />}
									>
										<Ariakit.MenuButtonArrow placement="left" />
									</Ariakit.MenuItem>
									<Ariakit.MenuHeading>{renderButton}</Ariakit.MenuHeading>
									<div />
								</div>
								<MenuSeparator />
							</>
						)}
						{children}
					</MenuContext.Provider>
				</Ariakit.Menu>
			</>
		);
	},
);

export type MenuItemProps = React.ComponentPropsWithoutRef<"button"> & {
	disabled?: boolean;
	label: React.ReactNode;
};

export const MenuItem = React.forwardRef<HTMLButtonElement, MenuItemProps>(
	({ label, ...props }, ref) => (
		<Ariakit.MenuItem
			// className="menu-item"
			className={menuItemClassName}
			focusOnHover={false}
			render={<button ref={ref} type="button" {...props} />}
		>
			{label}
		</Ariakit.MenuItem>
	),
);

export type MenuSeparatorProps = React.ComponentPropsWithoutRef<"hr"> & {};

export const MenuSeparator = React.forwardRef<
	HTMLHRElement,
	MenuSeparatorProps
>((props, ref) => <Ariakit.MenuSeparator ref={ref} {...props} />);

export type MenuGroupProps = React.ComponentPropsWithoutRef<"div"> & {
	label?: string;
};

export const MenuGroup = React.forwardRef<HTMLDivElement, MenuGroupProps>(
	({ label, ...props }, ref) => (
		<Ariakit.MenuGroup className="group" ref={ref} {...props}>
			{label && <Ariakit.MenuGroupLabel>{label}</Ariakit.MenuGroupLabel>}
			{props.children}
		</Ariakit.MenuGroup>
	),
);
