import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import CategoryIconsDropdown from "../../../components/customDropdowns.tsx/categoryIconsDropdown";
import { Spinner } from "../../../components/spinner";
import useIsMobileView from "../../../hooks/useIsMobileView";
import OptionsIcon from "../../../icons/optionsIcon";
import { type CategoriesData } from "../../../types/apiTypes";
import {
	type CategoryIconsDropdownTypes,
	type ChildrenTypes,
} from "../../../types/componentTypes";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
	smoothHoverClassName,
} from "../../../utils/commonClassNames";
import ShareContent from "../share/shareContent";

export type CollectionItemTypes = {
	count?: number;
	current: boolean;
	href: string;
	icon?: ChildrenTypes;
	iconColor: CategoriesData["icon_color"];
	iconValue?: string | null;
	id: number;
	isCollab?: boolean;
	isPublic?: boolean;
	name: string;
	responsiveIcon?: boolean;
};

export type listPropsTypes = {
	extendedClassname: string;
	isLink?: boolean;
	item: CollectionItemTypes;
	listNameId?: string;
	onCategoryOptionClick?: (
		value: number | string,
		current: boolean,
		id: number,
	) => void;
	onClick?: () => void;
	onIconColorChange?: CategoryIconsDropdownTypes["onIconColorChange"];
	onIconSelect?: (value: string, id: number) => void;
	responsiveIcon?: boolean;
	showDropdown?: boolean;
	showIconDropdown?: boolean;
	showSpinner?: boolean;
};

const SingleListItemComponent = (listProps: listPropsTypes) => {
	const [openedMenuId, setOpenedMenuId] = useState<number | null>(null);
	const [activeMenu, setActiveMenu] = useState<string | null>(null);
	const buttonRef = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				activeMenu === "share" &&
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setActiveMenu(null);
				setOpenedMenuId(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [activeMenu]);

	const {
		item,
		extendedClassname = "",
		showDropdown = false,
		showIconDropdown = true,
		listNameId = "",
		onIconSelect = () => null,
		onCategoryOptionClick = () => null,
		showSpinner = false,
		onIconColorChange = () => null,
		onClick = () => null,
		isLink = true,
		responsiveIcon = false,
	} = listProps;
	const { isDesktop } = useIsMobileView();
	const renderContent = () => (
		<>
			<div className="flex items-center">
				{showIconDropdown ? (
					// disabling eslint as the onClick is just preventdefault
					// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
					<span
						className="flex h-[18px] w-[18px]"
						onClick={(event) => event.preventDefault()}
					>
						<CategoryIconsDropdown
							buttonIconSize={18}
							iconColor={item?.iconColor}
							iconValue={item?.iconValue ?? null}
							onIconColorChange={onIconColorChange}
							onIconSelect={(value) => {
								onIconSelect(value, item?.id);
							}}
						/>
					</span>
				) : (
					<figure className="text-plain-reverse flex h-[18px] w-[18px] items-center">
						{item?.icon ? item?.icon : null}
					</figure>
				)}
				{(!responsiveIcon || isDesktop) && (
					<p
						className="font-450 ml-2 flex-1 truncate overflow-hidden text-[14px] leading-[115%] tracking-[0.01em]"
						id={listNameId}
					>
						{item?.name}
					</p>
				)}
			</div>
			<div className="relative flex items-center space-x-3">
				{showDropdown && (
					// disabling eslint as the onClick is just preventdefault
					// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
					<div
						className="flex h-4 w-4 items-center justify-center"
						onClick={(event) => event.preventDefault()}
					>
						{showSpinner ? (
							<Spinner
								className="h-3 w-3 animate-spin"
								style={{ color: "var(--color-plain-reverse)" }}
							/>
						) : (
							<AriaDropdown
								menuButton={
									<div
										className={
											openedMenuId === item?.id || activeMenu
												? "flex text-gray-500"
												: "hidden text-gray-500 group-hover:flex"
										}
									>
										<OptionsIcon />
									</div>
								}
								menuClassName={`${dropdownMenuClassName} z-10`}
								menuOpenToggle={(value) => {
									if (value) {
										setOpenedMenuId(item?.id);
										setActiveMenu(null);
									} else if (activeMenu !== "share") {
										setOpenedMenuId(null);
										setActiveMenu(null);
									}
								}}
							>
								{[
									{ label: "Share", value: "share" },
									{ label: "Delete", value: "delete" },
								]?.map((dropdownItem) => (
									<AriaDropdownMenu
										key={dropdownItem?.value}
										onClick={async (e) => {
											e.preventDefault();
											e.stopPropagation();

											if (dropdownItem?.value === "share") {
												setActiveMenu("share");
												return;
											}

											onCategoryOptionClick(
												dropdownItem?.value,
												item.current,
												item.id,
											);
											setOpenedMenuId(null);
										}}
									>
										<div className={dropdownMenuItemClassName}>
											{dropdownItem?.label}
										</div>
									</AriaDropdownMenu>
								))}

								{/* 👇 NEW: Inline ShareContent within same dropdown */}
								{activeMenu === "share" && (
									<div className="px-2 py-1">
										<ShareContent />
									</div>
								)}
							</AriaDropdown>
						)}
						{openedMenuId === item?.id && activeMenu === "share" && (
							<div
								ref={dropdownRef}
								className="absolute top-full right-0 z-50 mt-1 rounded-lg bg-gray-50 p-1 shadow-lg"
							>
								<ShareContent />
							</div>
						)}
						{item?.count !== undefined &&
							!showSpinner &&
							item?.current &&
							activeMenu !== "share" && (
								<p
									className={`font-450 h-3 w-3 items-center justify-end text-right align-middle text-[11px] leading-[115%] tracking-[0.03em] text-gray-600 ${
										showDropdown ? "block group-hover:hidden" : "block"
									} ${openedMenuId === item?.id ? "hidden" : ""}`}
								>
									{item?.count}
								</p>
							)}
					</div>
				)}
				{item?.count !== undefined && !showDropdown && (
					<span
						className={`${
							item?.name === "Tweets" ? "block" : "hidden"
						} font-450 text-[11px] leading-3 text-gray-600 ${
							showDropdown ? "block group-hover:hidden" : "block"
						}`}
					>
						{item?.count}
					</span>
				)}
			</div>
		</>
	);

	const contentWrapperClassNames = `${
		item?.current ? "bg-gray-100 text-gray-900" : "text-gray-800"
	} ${extendedClassname} ${smoothHoverClassName} side-pane-anchor group flex cursor-pointer items-center justify-between rounded-lg px-2 hover:bg-gray-100 hover:text-gray-900`;

	if (isLink) {
		return (
			<Link href={item?.href} legacyBehavior passHref>
				{/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
				<a className={contentWrapperClassNames} draggable={false}>
					{renderContent()}
				</a>
			</Link>
		);
	}

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div className={contentWrapperClassNames} onClick={onClick}>
			{renderContent()}
		</div>
	);
};

export default SingleListItemComponent;
