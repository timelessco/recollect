import { useState } from "react";
import Link from "next/link";

import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import CategoryIconsDropdown from "../../../components/customDropdowns.tsx/categoryIconsDropdown";
import { Spinner } from "../../../components/spinner";
import GlobeIcon from "../../../icons/globeIcon";
import OptionsIconGray from "../../../icons/optionsIconGray";
import UsersCollabIcon from "../../../icons/usersCollabIcon";
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
	showDropdown?: boolean;
	showIconDropdown?: boolean;
	showSpinner?: boolean;
};

const SingleListItemComponent = (listProps: listPropsTypes) => {
	const [openedMenuId, setOpenedMenuId] = useState<number | null>(null);

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
	} = listProps;

	const renderContent = () => (
		<>
			<div className="flex w-4/5 items-center">
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
					<figure className="flex h-[18px] w-[18px] items-center">
						{item?.icon ? item?.icon : null}
					</figure>
				)}
				<p
					className="ml-2 flex-1 overflow-hidden truncate text-sm font-[450] leading-4"
					id={listNameId}
				>
					{item?.name}
				</p>
			</div>
			<div className="flex items-center space-x-3">
				{showSpinner && (
					<Spinner
						className="h-3 w-3 animate-spin"
						style={{ color: "var(--plain-reverse-color)" }}
					/>
				)}
				{item?.isPublic && (
					<figure className="hidden">
						<GlobeIcon />
					</figure>
				)}
				{item?.isCollab && (
					<figure>
						<UsersCollabIcon />
					</figure>
				)}
				{showDropdown && (
					// disabling eslint as the onClick is just preventdefault
					// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
					<div
						className="flex h-4 w-4"
						onClick={(event) => event.preventDefault()}
					>
						<AriaDropdown
							menuButton={
								<div
									className={
										openedMenuId === item?.id
											? "flex"
											: "hidden group-hover:flex"
									}
								>
									<OptionsIconGray />
								</div>
							}
							menuClassName={`${dropdownMenuClassName} z-10`}
							menuOpenToggle={(value) => {
								if (value === true) {
									setOpenedMenuId(item?.id);
								} else {
									setOpenedMenuId(null);
								}
							}}
						>
							{[
								{ label: "Share", value: "share" },
								{ label: "Delete", value: "delete" },
							]?.map((dropdownItem) => (
								<AriaDropdownMenu
									key={dropdownItem?.value}
									onClick={() =>
										onCategoryOptionClick(
											dropdownItem?.value,
											item.current,
											item.id,
										)
									}
								>
									<div className={dropdownMenuItemClassName}>
										{dropdownItem?.label}
									</div>
								</AriaDropdownMenu>
							))}
						</AriaDropdown>
						{item?.count !== undefined && openedMenuId === null && (
							<p
								className={` hidden h-4 w-4 items-center justify-end text-right text-[11px] font-450 leading-3 text-custom-gray-10 ${
									showDropdown ? " block group-hover:hidden" : " block"
								}`}
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
						} text-[11px] font-450 leading-3 text-custom-gray-10 ${
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
		item?.current ? "bg-hover-color text-hover-text-color" : "text-text-color"
	} ${extendedClassname} ${smoothHoverClassName} side-pane-anchor  group flex cursor-pointer items-center justify-between rounded-lg px-2  hover:bg-hover-color hover:text-hover-text-color`;

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
