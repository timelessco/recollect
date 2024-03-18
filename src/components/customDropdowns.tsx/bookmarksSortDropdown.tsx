import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isEmpty } from "lodash";
import find from "lodash/find";

import AlphabeticalIcon from "../../icons/sortByIcons/alphabeticalIcon";
import ClockRewindIcon from "../../icons/sortByIcons/clockRewindIcon";
import DateIcon from "../../icons/sortByIcons/dateIcon";
import TickIcon from "../../icons/tickIcon";
import {
	useLoadersStore,
	useMiscellaneousStore,
} from "../../store/componentStore";
import {
	type CategoriesData,
	type FetchSharedCategoriesData,
	type ProfilesTableTypes,
} from "../../types/apiTypes";
import {
	type BookmarksSortByTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { type CategoryIdUrlTypes } from "../../types/componentTypes";
import {
	CATEGORIES_KEY,
	SHARED_CATEGORIES_TABLE_NAME,
	USER_PROFILE,
} from "../../utils/constants";
import AriaSelect from "../ariaSelect";
import { Menu, MenuItem } from "../ariaSlidingMenu";
import Spinner from "../spinner";

type BookmarksSortDropdownTypes = {
	categoryId: CategoryIdUrlTypes;
	isDropdown?: boolean;
	setBookmarksView: (
		value: BookmarksSortByTypes,
		type: BookmarkViewCategories,
	) => void;
	userId: string;
};

const BookmarksSortDropdown = (props: BookmarksSortDropdownTypes) => {
	const { setBookmarksView, categoryId, userId, isDropdown = true } = props;

	const queryClient = useQueryClient();
	const session = useSession();

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

	const setCurrentSliderDropdownSlide = useMiscellaneousStore(
		(state) => state.setCurrentSliderDropdownSlide,
	);

	const isSortByLoading = useLoadersStore((state) => state.isSortByLoading);

	const currentCategory = find(
		categoryData?.data,
		(item) => item?.id === categoryId,
	);

	const isInNonCategoryPage = typeof categoryId !== "number";

	const getSortValue = () => {
		if (!isInNonCategoryPage) {
			// user is in a category page

			// tells if the user is the category owner
			const isUserTheCategoryOwner = currentCategory?.user_id?.id === userId;

			if (isUserTheCategoryOwner) {
				// if user is the category owner then get value from category table
				return currentCategory?.category_views?.sortBy;
			} else {
				// if user is not the category owner then get value from the shared category table
				const sharedCategoryUserData = find(
					sharedCategoriesData?.data,
					(item) =>
						item?.category_id === categoryId &&
						item?.email === session?.user?.email,
				);

				return sharedCategoryUserData?.category_views?.sortBy;
			}
		}

		if (!isEmpty(userProfilesData?.data)) {
			return userProfilesData?.data[0]?.bookmarks_view?.sortBy as string;
		}

		return "";
	};

	const bookmarksSortValue = getSortValue();

	const sortOptions = [
		// {
		//   label: "By date ↑",
		//   value: "date-sort-acending",
		// },
		// {
		//   label: "By Date",
		//   value: "date-sort-decending",
		// },
		// {
		//   label: "By Name (A → Z)",
		//   value: "alphabetical-sort-acending",
		// },
		// {
		//   label: "By name (Z → A)",
		//   value: "alphabetical-sort-decending",
		// },
		// {
		//   label: "By url (A → Z)",
		//   value: "url-sort-acending",
		// },
		// {
		//   label: "By url (Z → A)",
		//   value: "url-sort-decending",
		// },
		{
			label: "Recent First",
			value: "date-sort-acending",
			icon: <DateIcon />,
		},
		{
			label: "Oldest First",
			value: "date-sort-decending",
			icon: <ClockRewindIcon />,
		},
		{
			label: "Alphabetical",
			value: "alphabetical-sort-decending",
			icon: <AlphabeticalIcon />,
		},
	];

	const currentValue = find(
		sortOptions,
		(item) => item?.value === bookmarksSortValue,
	);

	const buttonContent = (
		<>
			{isSortByLoading ? (
				<span className="mr-[6px]">
					<Spinner />
				</span>
			) : (
				<figure className="h-4 w-4">{currentValue?.icon}</figure>
			)}
			<p className="ml-[6px]">{currentValue?.label}</p>
		</>
	);

	const selectItemContent = (value: string) => (
		<div className="flex items-center py-[1px]">
			<figure className="mr-[6px] h-4 w-4">
				{find(sortOptions, (item) => item?.label === value)?.icon}
			</figure>
			<div className="flex w-full items-center justify-between">
				{find(sortOptions, (item) => item?.label === value)?.label}
				{value === currentValue?.label ? (
					<figure className=" h-3 w-3">
						<TickIcon />
					</figure>
				) : null}
			</div>
		</div>
	);
	return isDropdown ? (
		<AriaSelect
			defaultValue={currentValue?.label ?? ""}
			key={bookmarksSortValue}
			onOptionClick={(value) => {
				setBookmarksView(value as BookmarksSortByTypes, "sort");
			}}
			options={sortOptions}
			renderCustomSelectButton={(open) => (
				<div
					className={`flex items-center rounded-lg px-2 py-[5px] hover:bg-custom-gray-8 ${
						open ? "bg-custom-gray-8" : ""
					}`}
					title="sort-by"
				>
					{buttonContent}
				</div>
			)}
			renderCustomSelectItem={(value) => selectItemContent(value)}
		/>
	) : (
		<Menu
			onClick={() => setCurrentSliderDropdownSlide("sort")}
			renderButton={<div className=" flex items-center">{buttonContent}</div>}
		>
			{sortOptions?.map((item) => {
				const value = item?.label;
				return (
					<MenuItem
						key={value}
						label=""
						onClick={() =>
							setBookmarksView(item?.value as BookmarksSortByTypes, "sort")
						}
					>
						{selectItemContent(value)}
					</MenuItem>
				);
			})}
		</Menu>
	);
};

export default BookmarksSortDropdown;
