import find from "lodash/find";

import { useBookmarksViewUpdate } from "../../hooks/useBookmarksViewUpdate";
import useGetSortBy from "../../hooks/useGetSortBy";
import AlphabeticalIcon from "../../icons/sortByIcons/alphabeticalIcon";
import ClockRewindIcon from "../../icons/sortByIcons/clockRewindIcon";
import DateIcon from "../../icons/sortByIcons/dateIcon";
import { TickIcon } from "../../icons/tickIcon";
import { type BookmarksSortByTypes } from "../../types/componentStoreTypes";
import { dropdownMenuItemClassName } from "../../utils/commonClassNames";

const sortOptions = [
	{
		label: "Recent First",
		value: "date-sort-ascending",
		icon: <DateIcon />,
	},
	{
		label: "Oldest First",
		value: "date-sort-descending",
		icon: <ClockRewindIcon />,
	},
	{
		label: "Alphabetical",
		value: "alphabetical-sort-descending",
		icon: <AlphabeticalIcon />,
	},
];

interface BookmarksSortDropdownProps {
	isDropdown?: boolean;
	renderOnlyButton?: boolean;
}

export const BookmarksSortDropdown = (props: BookmarksSortDropdownProps) => {
	const { isDropdown = true, renderOnlyButton = false } = props;

	if (renderOnlyButton) {
		return <BookmarksSortButton />;
	}

	return isDropdown ? null : <BookmarksSortItems />;
};

function BookmarksSortButton() {
	const { sortBy } = useGetSortBy();
	const currentValue = find(sortOptions, (item) => item.value === sortBy);

	return (
		<div className={`flex ${dropdownMenuItemClassName}`}>
			<figure className="h-4 w-4">{currentValue?.icon}</figure>
			<p className="ml-[6px]">{currentValue?.label}</p>
		</div>
	);
}

function BookmarksSortItems() {
	const { sortBy } = useGetSortBy();
	const { setBookmarksView } = useBookmarksViewUpdate();

	return (
		<div>
			<div className="px-2 py-[6px] text-[12px] leading-[115%] font-450 tracking-[0.02em] text-gray-600">
				Sort by
			</div>
			{sortOptions.map((item) => (
				<button
					className={`w-full text-left ${dropdownMenuItemClassName}`}
					key={item.value}
					onClick={() =>
						setBookmarksView(item.value as BookmarksSortByTypes, "sort")
					}
					type="button"
				>
					<SortItemContent
						icon={item.icon}
						isSelected={item.value === sortBy}
						label={item.label}
					/>
				</button>
			))}
		</div>
	);
}

interface SortItemContentProps {
	icon: React.ReactNode;
	isSelected: boolean;
	label: string;
}

function SortItemContent({ icon, isSelected, label }: SortItemContentProps) {
	return (
		<div className="flex items-center py-px">
			<figure className="mr-[6px] h-4 w-4">{icon}</figure>
			<div className="flex w-full items-center justify-between">
				{label}
				{isSelected ? (
					<figure className="h-3 w-3">
						<TickIcon className="text-gray-800" />
					</figure>
				) : null}
			</div>
		</div>
	);
}
