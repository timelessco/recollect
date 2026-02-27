import { useCallback, useRef } from "react";
import { Bars4Icon } from "@heroicons/react/20/solid";
import { Menu, MenuButton, useMenuState } from "ariakit/menu";
import debounce from "lodash/debounce";
import find from "lodash/find";

import { useBookmarksViewUpdate } from "../../hooks/useBookmarksViewUpdate";
import useGetViewValue from "../../hooks/useGetViewValue";
import CardIcon from "../../icons/viewIcons/cardIcon";
import ListIcon from "../../icons/viewIcons/listIcon";
import MoodboardIconGray from "../../icons/viewIcons/moodboardIconGray";
import { type BookmarksViewTypes } from "../../types/componentStoreTypes";
import { dropdownMenuItemClassName } from "../../utils/commonClassNames";
import { singleInfoValues, viewValues } from "../../utils/constants";
import Button from "../atoms/button";
import RadioGroup from "../radioGroup";
import Slider from "../slider";

import { BookmarkCardContentSwitch } from "./bookmark-card-content-switch";

type BookmarksViewDropdownProps = {
	// based on this it is either rendered in dropdown or in the sliding menu component if its in responsive mobile page
	isDropdown?: boolean;
	renderOnlyButton?: boolean;
};

// This renders the view options
const BookmarksViewDropdown = (props: BookmarksViewDropdownProps) => {
	const { isDropdown = true, renderOnlyButton = false } = props;

	const { setBookmarksView } = useBookmarksViewUpdate();

	const bookmarksColumns = useGetViewValue("moodboardColumns", [10]);
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
	const menu = useMenuState({ gutter: 8 });
	const radio0ref = useRef<HTMLInputElement>(null);

	const renderDropdownHeader = (text: string) => (
		<div className="px-2 py-[6px] text-xs leading-[14px] font-450 text-gray-600">
			{text}
		</div>
	);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const setColumnsCallback = useCallback(
		debounce((value) => setBookmarksView(value as number[], "columns"), 200),
		[setBookmarksView],
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
						<Slider
							defaultValue={bookmarksColumns as unknown as number}
							label="moodboard-cols-slider"
							maxValue={50}
							minValue={10}
							onChangeEnd={(value) => {
								const columValue = value as number[];
								// do not fire api if the new value is the same as previous value
								if (columValue?.[0] !== bookmarksColumns?.[0]) {
									setColumnsCallback(value);
								}
							}}
							step={10}
						/>
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
		<>
			<MenuButton as="div" className="outline-hidden" state={menu}>
				<Button isActive={menu.open} title="views" type="light">
					{dropdownButtonContent}
				</Button>
			</MenuButton>
			<Menu
				className="z-20 w-[195px] origin-top-left rounded-xl bg-white px-[6px] pt-[6px] pb-3 shadow-custom-1 ring-1 ring-black/5"
				// @ts-expect-error - TODO: fix this
				initialFocusRef={radio0ref}
				state={menu}
			>
				{dropdownContent}
			</Menu>
		</>
	) : (
		<div>{dropdownContent}</div>
	);
};

export default BookmarksViewDropdown;
