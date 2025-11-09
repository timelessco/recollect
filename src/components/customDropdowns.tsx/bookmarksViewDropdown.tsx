import { useCallback, useRef } from "react";
import { ViewListIcon } from "@heroicons/react/solid";
import { Menu, MenuButton, useMenuState } from "ariakit/menu";
import { debounce } from "lodash";
import find from "lodash/find";

import useGetViewValue from "../../hooks/useGetViewValue";
import useIsUserInTweetsPage from "../../hooks/useIsUserInTweetsPage";
import CardIcon from "../../icons/viewIcons/cardIcon";
import ListIcon from "../../icons/viewIcons/listIcon";
import MoodboardIconGray from "../../icons/viewIcons/moodboardIconGray";
import {
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { dropdownMenuItemClassName } from "../../utils/commonClassNames";
import { singleInfoValues, viewValues } from "../../utils/constants";
import { errorToast } from "../../utils/toastMessages";
import Button from "../atoms/button";
import RadioGroup from "../radioGroup";
import Slider from "../slider";
import Switch from "../switch";

type BookmarksViewDropdownProps = {
	// based on this it is either rendered in dropdown or in the sliding menu component if its in responsive mobile page
	isDropdown?: boolean;
	renderOnlyButton?: boolean;
	setBookmarksView: (
		value: BookmarksViewTypes | number[] | string[],
		type: BookmarkViewCategories,
	) => void;
};

// This renders the view options
const BookmarksViewDropdown = (props: BookmarksViewDropdownProps) => {
	const {
		setBookmarksView,
		isDropdown = true,
		renderOnlyButton = false,
	} = props;

	const bookmarksInfoValue = useGetViewValue("cardContentViewArray", []);
	const bookmarksColumns = useGetViewValue("moodboardColumns", [10]);
	const bookmarksViewValue = useGetViewValue("bookmarksView", "");

	const isInTweetsPage = useIsUserInTweetsPage();

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
			icon: <ViewListIcon className="h-4 w-4" />,
		},
	];
	const menu = useMenuState({ gutter: 8 });
	const radio0ref = useRef<HTMLInputElement>(null);

	const renderDropdownHeader = (text: string) => (
		<div className="px-2 py-[6px] text-xs font-450 leading-[14px] text-gray-600">
			{text}
		</div>
	);

	const renderViewsSwitch = (item: CardContentOptionsTypes) => {
		const isEnabledLogic = () => {
			if (bookmarksViewValue === viewValues.headlines) {
				return (
					item?.value === singleInfoValues.cover ||
					item?.value === singleInfoValues.title ||
					item?.value === singleInfoValues.info
				);
			}

			if (
				bookmarksViewValue === viewValues.moodboard ||
				bookmarksViewValue === viewValues.card
			) {
				// if in moodboard or card only enable cover
				if (item?.label === "Cover") {
					return true;
				} else {
					return bookmarksInfoValue?.includes(item?.value as never) || false;
				}
			}

			if (bookmarksViewValue === viewValues.list) {
				// if in list only enable title
				if (item?.label === "Title") {
					return true;
				} else {
					return bookmarksInfoValue?.includes(item?.value as never) || false;
				}
			}

			return bookmarksInfoValue?.includes(item?.value as never) || false;
		};

		const isDisabledLogic = () => {
			if (isInTweetsPage) {
				// if in twitter page then disable all the options
				return true;
			}

			if (bookmarksViewValue === viewValues.headlines) {
				// if headlines disable all
				return true;
			}

			if (
				bookmarksViewValue === viewValues.moodboard ||
				bookmarksViewValue === viewValues.card
			) {
				// if moodboard or card disable cover
				return item?.label === "Cover";
			}

			if (bookmarksViewValue === viewValues.list) {
				// if in title disable title
				return item?.label === "Title";
			}

			return false;
		};

		return (
			<div
				className="flex items-center justify-between px-2 py-[5.5px]"
				key={item.label}
			>
				<p className="text-13 font-450 leading-[115%] tracking-[0.01em] text-gray-800">
					{item?.label}
				</p>
				<Switch
					disabled={isDisabledLogic()}
					enabled={isEnabledLogic()}
					setEnabled={() => {
						if (bookmarksInfoValue?.includes(item.value as never)) {
							if (bookmarksInfoValue?.length > 1) {
								setBookmarksView(
									(bookmarksInfoValue as string[])?.filter(
										(viewItem) => viewItem !== item.value,
									),
									singleInfoValues.info as BookmarkViewCategories,
								);
							} else {
								errorToast("Atleast one view option needs to be selected");
							}
						} else {
							setBookmarksView(
								[...(bookmarksInfoValue as string[]), item.value],
								singleInfoValues.info as BookmarkViewCategories,
							);
						}
					}}
					size="small"
				/>
			</div>
		);
	};

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const setColumnsCallback = useCallback(
		debounce((value) => setBookmarksView(value as number[], "colums"), 200),
		[setBookmarksView],
	);

	const dropdownContent = (
		<>
			{renderDropdownHeader("View as")}
			<div>
				<RadioGroup
					disabled={isInTweetsPage}
					initialRadioRef={radio0ref}
					onChange={(value) => {
						setBookmarksView(value as BookmarksViewTypes, "view");
					}}
					radioList={bookmarksViewOptions}
					value={bookmarksViewValue as string}
				/>
			</div>
			{renderDropdownHeader("Show in Cards")}
			<div>{cardContentOptions?.map((item) => renderViewsSwitch(item))}</div>
			{bookmarksViewValue === viewValues.card ||
			bookmarksViewValue === viewValues.moodboard ? (
				<div className="flex items-center justify-between px-2 py-[5.5px]">
					<p className="text-13 font-450 leading-[14px] text-gray-800">
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
			) : (
				<div className="h-[34px] w-[162px]" />
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
			<MenuButton as="div" className="outline-none" state={menu}>
				<Button isActive={menu.open} title="views" type="light">
					{dropdownButtonContent}
				</Button>
			</MenuButton>
			<Menu
				className="z-20 w-[195px] origin-top-left rounded-xl bg-white px-[6px] pb-3 pt-[6px] shadow-custom-1 ring-1 ring-black/5"
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
