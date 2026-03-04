import { useRef } from "react";
import { Popover } from "@base-ui/react/popover";
import { Bars4Icon } from "@heroicons/react/20/solid";
import find from "lodash/find";

import { useBookmarksViewUpdate } from "../../hooks/useBookmarksViewUpdate";
import useGetViewValue from "../../hooks/useGetViewValue";
import CardIcon from "../../icons/viewIcons/cardIcon";
import ListIcon from "../../icons/viewIcons/listIcon";
import MoodboardIconGray from "../../icons/viewIcons/moodboardIconGray";
import { type BookmarksViewTypes } from "../../types/componentStoreTypes";
import { dropdownMenuItemClassName } from "../../utils/commonClassNames";
import { singleInfoValues, viewValues } from "../../utils/constants";
import RadioGroup from "../radioGroup";

import { BookmarkCardContentSwitch } from "./bookmark-card-content-switch";
import { BookmarksViewSlider } from "./bookmarks-view-slider";

type BookmarksViewDropdownProps = {
	// based on this it is either rendered in dropdown or in the sliding menu component if its in responsive mobile page
	isDropdown?: boolean;
	renderOnlyButton?: boolean;
};

// This renders the view options
export const BookmarksViewDropdown = (props: BookmarksViewDropdownProps) => {
	const { isDropdown = true, renderOnlyButton = false } = props;

	const { setBookmarksView } = useBookmarksViewUpdate();

	const bookmarksViewValue = useGetViewValue("bookmarksView", "");

	type CardContentOptionsTypes = {
		label: string;
		value: string;
	};
	const cardContentOptions: CardContentOptionsTypes[] = [
		{
			label: "Cover",
			value: singleInfoValues.cover,
		},
		{
			label: "Title",
			value: singleInfoValues.title,
		},
		{
			label: "Description",
			value: singleInfoValues.description,
		},
		{
			label: "Tags",
			value: singleInfoValues.tags,
		},
		{
			label: "Info",
			value: singleInfoValues.info,
		},
	];

	const bookmarksViewOptions = [
		{
			label: "Moodboard",
			value: viewValues.moodboard,
			icon: <MoodboardIconGray />,
		},
		{
			label: "List",
			value: viewValues.list,
			icon: <ListIcon />,
		},
		{
			label: "Card",
			value: viewValues.card,
			icon: <CardIcon />,
		},
		{
			label: "Timeline",
			value: viewValues.timeline,
			icon: <Bars4Icon className="h-4 w-4" />,
		},
	];
	const radio0ref = useRef<HTMLInputElement>(null);

	const renderDropdownHeader = (text: string) => (
		<div className="px-2 py-[6px] text-xs leading-[14px] font-450 text-gray-600">
			{text}
		</div>
	);

	const dropdownContent = (
		<>
			{renderDropdownHeader("View as")}
			<div>
				<RadioGroup
					disabled={false}
					initialRadioRef={radio0ref}
					onChange={(value) => {
						setBookmarksView(value as BookmarksViewTypes, "view");
					}}
					radioList={bookmarksViewOptions}
					value={bookmarksViewValue as string}
				/>
			</div>
			{renderDropdownHeader("Show in Cards")}
			{cardContentOptions.map((option) => (
				<BookmarkCardContentSwitch key={option.value} option={option} />
			))}
			{(bookmarksViewValue === viewValues.card ||
				bookmarksViewValue === viewValues.moodboard) && (
				<div className="flex items-center justify-between px-2 py-[5px]">
					<p className="text-13 leading-[14.95px] font-450 text-gray-800">
						Columns
					</p>
					<div className="mt-px w-[90px]">
						<BookmarksViewSlider />
					</div>
				</div>
			)}
		</>
	);

	const dropdownButtonContent = (
		<>
			<figure className="h-4 w-4">
				{
					find(
						bookmarksViewOptions,
						(item) => item?.value === bookmarksViewValue,
					)?.icon
				}
			</figure>
			<span className="ml-[7px]">
				{
					find(
						bookmarksViewOptions,
						(item) => item?.value === bookmarksViewValue,
					)?.label
				}
			</span>
		</>
	);

	if (renderOnlyButton) {
		return (
			<div className={`flex ${dropdownMenuItemClassName}`}>
				{dropdownButtonContent}
			</div>
		);
	}

	return isDropdown ? (
		<BookmarksViewPopover trigger={dropdownButtonContent}>
			{dropdownContent}
		</BookmarksViewPopover>
	) : (
		<div>{dropdownContent}</div>
	);
};

interface BookmarksViewPopoverProps {
	trigger: React.ReactNode;
	children: React.ReactNode;
}

const BookmarksViewPopover = ({
	trigger,
	children,
}: BookmarksViewPopoverProps) => (
	<Popover.Root>
		<Popover.Trigger
			className="flex items-center rounded-lg bg-transparent px-2 py-[5px] text-13 leading-[14px] font-medium outline-hidden hover:bg-gray-100 data-popup-open:bg-gray-100"
			title="views"
		>
			{trigger}
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Positioner sideOffset={8}>
				<Popover.Popup className="z-20 w-[195px] origin-(--transform-origin) rounded-xl bg-white px-[6px] pt-[6px] pb-3 shadow-custom-1 ring-1 ring-black/5">
					{children}
				</Popover.Popup>
			</Popover.Positioner>
		</Popover.Portal>
	</Popover.Root>
);
