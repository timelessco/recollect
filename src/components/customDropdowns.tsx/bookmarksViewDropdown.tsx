import { useRef } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, MenuButton, useMenuState } from "ariakit/menu";
import { isEmpty } from "lodash";
import find from "lodash/find";

import CardIcon from "../../icons/viewIcons/cardIcon";
import HeadlinesIcon from "../../icons/viewIcons/headLinesIcon";
import ListIcon from "../../icons/viewIcons/listIcon";
import MoodboardIconGray from "../../icons/viewIcons/moodboardIconGray";
import {
	type CategoriesData,
	type FetchSharedCategoriesData,
	type ProfilesTableTypes,
} from "../../types/apiTypes";
import {
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { type CategoryIdUrlTypes } from "../../types/componentTypes";
import {
	CATEGORIES_KEY,
	SHARED_CATEGORIES_TABLE_NAME,
	USER_PROFILE,
} from "../../utils/constants";
import { isUserInACategory } from "../../utils/helpers";
import { errorToast } from "../../utils/toastMessages";
import Button from "../atoms/button";
// import Checkbox from "../checkbox";
import RadioGroup from "../radioGroup";
import Slider from "../slider";
import Switch from "../switch";

type BookmarksViewDropdownProps = {
	categoryId: CategoryIdUrlTypes;
	setBookmarksView: (
		value: BookmarksViewTypes | number[] | string[],
		type: BookmarkViewCategories,
	) => void;
	userId: string;
};

const BookmarksViewDropdown = (props: BookmarksViewDropdownProps) => {
	const { setBookmarksView, categoryId, userId } = props;
	const queryClient = useQueryClient();

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const sharedCategoriesData = queryClient.getQueryData([
		SHARED_CATEGORIES_TABLE_NAME,
	]) as {
		data: FetchSharedCategoriesData[];
		error: PostgrestError;
	};

	const currentCategory = find(
		categoryData?.data,
		(item) => item?.id === categoryId,
	);

	const isUserTheCategoryOwner = userId === currentCategory?.user_id?.id;

	const getViewValue = (
		viewType: "bookmarksView" | "cardContentViewArray" | "moodboardColumns",
		defaultReturnValue: string | [] | [number],
	) => {
		if (categoryId !== null) {
			// TODO: change this into array check
			if (typeof categoryId !== "number" && !isUserInACategory(categoryId)) {
				return userProfilesData?.data[0]?.bookmarks_view?.[viewType];
			}

			if (isUserTheCategoryOwner) {
				return currentCategory?.category_views?.[viewType];
			}

			if (!isEmpty(sharedCategoriesData?.data)) {
				return find(
					sharedCategoriesData?.data,
					(item) => item?.category_id === currentCategory?.id,
				)?.category_views?.[viewType];
			}

			return defaultReturnValue;
		}

		if (!isEmpty(userProfilesData?.data)) {
			return userProfilesData?.data[0]?.bookmarks_view?.[viewType];
		}

		return defaultReturnValue;
	};

	const bookmarksInfoValue = getViewValue("cardContentViewArray", []) as [];
	const bookmarksColumns = getViewValue("moodboardColumns", [10]);
	const bookmarksViewValue = getViewValue("bookmarksView", "");

	type CardContentOptionsTypes = {
		label: string;
		value: string;
	};
	const cardContentOptions: CardContentOptionsTypes[] = [
		{
			label: "Cover",
			value: "cover",
		},
		{
			label: "Title",
			value: "title",
		},
		{
			label: "Description",
			value: "description",
		},
		{
			label: "Tags",
			value: "tags",
		},
		{
			label: "Info",
			value: "info",
		},
	];

	const bookmarksViewOptions = [
		{
			label: "Moodboard",
			value: "moodboard",
			icon: <MoodboardIconGray />,
		},
		{
			label: "List",
			value: "list",
			icon: <ListIcon />,
		},
		{
			label: "Card",
			value: "card",
			icon: <CardIcon />,
		},
		{
			label: "Headlines",
			value: "headlines",
			icon: <HeadlinesIcon />,
		},
	];
	const menu = useMenuState({ gutter: 8 });
	const radio0ref = useRef<HTMLInputElement>(null);

	const renderDropdownHeader = (text: string) => (
		<div className="px-2 py-[6px] text-xs font-450 leading-[14px] text-custom-gray-10">
			{text}
		</div>
	);

	const renderViewsSwitch = (item: CardContentOptionsTypes) => {
		const isEnabledLogic = () => {
			if (bookmarksViewValue === "headlines") {
				return (
					item?.value === "cover" ||
					item?.value === "title" ||
					item?.value === "info"
				);
			}

			if (bookmarksViewValue === "moodboard" || bookmarksViewValue === "card") {
				// if in moodboard or card only enable cover
				if (item?.label === "Cover") {
					return true;
				} else {
					return bookmarksInfoValue?.includes(item?.value as never) || false;
				}
			}

			if (bookmarksViewValue === "list") {
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
			if (bookmarksViewValue === "headlines") {
				// if headlines disable all
				return true;
			}

			if (bookmarksViewValue === "moodboard" || bookmarksViewValue === "card") {
				// if moodboard or card disable cover
				return item?.label === "Cover";
			}

			if (bookmarksViewValue === "list") {
				// if in title disable title
				return item?.label === "Title";
			}

			return false;
		};

		return (
			<div
				className="flex items-center justify-between px-2 py-[5px]"
				key={item.label}
			>
				<p className=" text-13 font-450 leading-[14px] text-custom-gray-1">
					{item?.label}
				</p>
				<Switch
					disabled={isDisabledLogic()}
					enabled={isEnabledLogic()}
					setEnabled={() => {
						if (bookmarksInfoValue?.includes(item.value as never)) {
							if (bookmarksInfoValue?.length > 1) {
								setBookmarksView(
									bookmarksInfoValue?.filter(
										(viewItem) => viewItem !== item.value,
									),
									"info",
								);
							} else {
								errorToast("Atleast one view option needs to be selcted");
							}
						} else {
							setBookmarksView(
								[...(bookmarksInfoValue as string[]), item.value],
								"info",
							);
						}
					}}
					size="small"
				/>
			</div>
		);
	};

	return (
		<>
			<MenuButton as="div" className="outline-none" state={menu}>
				<Button isActive={menu.open} title="views" type="light">
					<figure className="h-4 w-4">
						{
							find(
								bookmarksViewOptions,
								(item) => item?.value === bookmarksViewValue,
							)?.icon
						}
					</figure>
					<span className="ml-[7px] text-custom-gray-1 xl:hidden">
						{
							find(
								bookmarksViewOptions,
								(item) => item?.value === bookmarksViewValue,
							)?.label
						}
					</span>
				</Button>
			</MenuButton>
			<Menu
				className="z-20 w-[195px] origin-top-left rounded-xl bg-white px-[6px] pb-3 pt-[6px] shadow-custom-1 ring-1 ring-black/5"
				initialFocusRef={radio0ref}
				state={menu}
			>
				{renderDropdownHeader("View as")}
				<div>
					<RadioGroup
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
				{bookmarksViewValue === "card" || bookmarksViewValue === "moodboard" ? (
					<div className="flex items-center justify-between px-2 py-[4.5px]">
						<p className="text-13 font-450 leading-[14px] text-custom-gray-1">
							Cover size
						</p>
						<div className="w-[90px]">
							<Slider
								label="moodboard-cols-slider"
								maxValue={50}
								minValue={10}
								onChange={(value) =>
									setBookmarksView(value as number[], "colums")
								}
								step={10}
								value={bookmarksColumns as unknown as number}
							/>
						</div>
					</div>
				) : (
					<div className="h-[34px] w-[162px]" />
				)}
			</Menu>
		</>
	);
};

export default BookmarksViewDropdown;
