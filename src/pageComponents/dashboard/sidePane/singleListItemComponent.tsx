import { useState } from "react";
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
			<div className="flex items-center space-x-3">
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
								menuClassName={`${activeMenu ? "w-auto" : ""} ${dropdownMenuClassName} z-10`}
								menuOpenToggle={(value) => {
									if (value) {
										setOpenedMenuId(item?.id);
										setActiveMenu(null);
									} else {
										setOpenedMenuId(null);
										setActiveMenu(null);
									}
								}}
							>
								{!activeMenu ? (
									<>
										{[
											{ label: "Share", value: "share" },
											{ label: "Delete", value: "delete" },
										].map((dropdownItem) => (
											<AriaDropdownMenu
												key={dropdownItem?.value}
												onClick={async (event) => {
													event.preventDefault();
													event.stopPropagation();

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
									</>
								) : (
									<div className="rounded-lg bg-gray-50 p-1 shadow-lg">
										<ShareContent />
									</div>
								)}
							</AriaDropdown>
						)}

						{item?.count !== undefined &&
							!showSpinner &&
							activeMenu !== "share" &&
							item?.current && (
								<div className="flex w-full justify-end">
									<p
										className={`font-450 min-w-[16px] text-right text-[11px] leading-[115%] tracking-[0.03em] text-gray-600 ${
											showDropdown ? "block group-hover:hidden" : "block"
										} ${openedMenuId === item?.id ? "hidden" : ""}`}
									>
										{item?.count}
									</p>
								</div>
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
			<Link
				href={item?.href}
				passHref
				className={contentWrapperClassNames}
				draggable={false}
			>
				{renderContent()}
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
