import find from "lodash/find";

import useGetSortBy from "../../hooks/useGetSortBy";
import AlphabeticalIcon from "../../icons/sortByIcons/alphabeticalIcon";
import ClockRewindIcon from "../../icons/sortByIcons/clockRewindIcon";
import DateIcon from "../../icons/sortByIcons/dateIcon";
import TickIcon from "../../icons/tickIcon";
import { useLoadersStore } from "../../store/componentStore";
import {
	type BookmarksSortByTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { dropdownMenuItemClassName } from "../../utils/commonClassNames";
import { AriaDropdownMenu } from "../ariaDropdown";
import AriaSelect from "../ariaSelect";
import Spinner from "../spinner";

type BookmarksSortDropdownTypes = {
	isDropdown?: boolean;
	renderOnlyButton?: boolean;
	setBookmarksView: (
		value: BookmarksSortByTypes,
		type: BookmarkViewCategories,
	) => void;
};

const BookmarksSortDropdown = (props: BookmarksSortDropdownTypes) => {
	const {
		setBookmarksView,
		isDropdown = true,
		renderOnlyButton = false,
	} = props;

	const isSortByLoading = useLoadersStore((state) => state.isSortByLoading);

	const { sortBy: bookmarksSortValue } = useGetSortBy();

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
					<figure className="h-3 w-3">
						<TickIcon color="var(--copy-link-text-color)" />
					</figure>
				) : null}
			</div>
		</div>
	);

	if (renderOnlyButton) {
		return (
			<div className={`flex ${dropdownMenuItemClassName}`}>{buttonContent}</div>
		);
	}

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
		<div>
			{sortOptions?.map((item) => {
				const value = item?.label;
				return (
					<AriaDropdownMenu
						className={dropdownMenuItemClassName}
						key={value}
						onClick={() =>
							setBookmarksView(item?.value as BookmarksSortByTypes, "sort")
						}
					>
						{selectItemContent(value)}
					</AriaDropdownMenu>
				);
			})}
		</div>
	);

	// : (
	// 	<Menu
	// 		onClick={() => setCurrentSliderDropdownSlide("sort")}
	// 		renderButton={<div className=" flex items-center">{buttonContent}</div>}
	// 	>
	// {sortOptions?.map((item) => {
	// 	const value = item?.label;
	// 	return (
	// 		<MenuItem
	// 			key={value}
	// 			label=""
	// 			onClick={() =>
	// 				setBookmarksView(item?.value as BookmarksSortByTypes, "sort")
	// 			}
	// 		>
	// 			{selectItemContent(value)}
	// 		</MenuItem>
	// 	);
	// })}
	// 	</Menu>
	// );
};

export default BookmarksSortDropdown;
