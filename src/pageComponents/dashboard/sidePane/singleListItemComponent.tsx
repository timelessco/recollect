import Link from "next/link";

import CategoryIconsDropdown from "../../../components/customDropdowns.tsx/categoryIconsDropdown";
import { Spinner } from "../../../components/spinner";
import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { type CategoriesData } from "../../../types/apiTypes";
import { type ChildrenTypes } from "../../../types/componentTypes";

import { CollectionOptionsPopover } from "./collection-options-popover";

export type CollectionItemTypes = {
	count?: number;
	current: boolean;
	href: string;
	icon?: ChildrenTypes;
	iconColor: CategoriesData["icon_color"];
	iconValue?: string | null;
	id: number;
	isCollab?: boolean;
	isFavorite?: boolean;
	isPublic?: boolean;
	name: string;
	responsiveIcon?: boolean;
};

export type listPropsTypes = {
	extendedClassname: string;
	isLink?: boolean;
	item: CollectionItemTypes;
	listNameId?: string;
	onClick?: () => void;
	responsiveIcon?: boolean;
	showDropdown?: boolean;
	showIconDropdown?: boolean;
	showSpinner?: boolean;
};

const SingleListItemComponent = (listProps: listPropsTypes) => {
	const {
		item,
		extendedClassname = "",
		showDropdown = false,
		showIconDropdown = true,
		listNameId = "",
		showSpinner = false,
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
							iconId={item?.id}
						/>
					</span>
				) : (
					<figure className="flex h-[18px] w-[18px] items-center text-gray-900">
						{item?.icon ? item?.icon : null}
					</figure>
				)}
				{(!responsiveIcon || isDesktop) && (
					<p
						className="ml-2 flex-1 truncate overflow-hidden text-[14px] leading-[115%] font-450 tracking-[0.01em]"
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
						className="flex items-center justify-center"
						onClick={(event) => event.preventDefault()}
					>
						{showSpinner ? (
							<Spinner
								className="h-3 w-3 animate-spin"
								style={{ color: "var(--color-plain-reverse)" }}
							/>
						) : (
							<CollectionOptionsPopover item={item} />
						)}
					</div>
				)}
				{item?.count !== undefined &&
					!showDropdown &&
					item?.current &&
					item?.name !== "Everything" &&
					item?.name !== "Inbox" &&
					item?.name !== "Trash" && (
						<span
							className={`text-[11px] leading-3 font-450 text-gray-600 ${
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
	} ${extendedClassname} side-pane-anchor group flex cursor-pointer items-center justify-between rounded-lg px-2 hover:bg-gray-100 hover:text-gray-900`;

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
