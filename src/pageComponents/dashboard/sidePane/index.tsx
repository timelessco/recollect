import { memo } from "react";

import { type CategoryIconsDropdownTypes } from "../../../types/componentTypes";

import SidePaneCollectionsList from "./sidePaneCollectionsList";
import SidePaneOptionsMenu from "./sidePaneOptionsMenu";
import SidePaneTypesList from "./sidePaneTypesList";
import SidePaneUserDropdown from "./sidePaneUserDropdown";

type SidePaneTypes = {
	onAddNewCategory: (value: string) => Promise<void>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onBookmarksDrop: (event: any) => Promise<void>;
	onCategoryOptionClick: (
		value: number | string,
		current: boolean,
		id: number,
	) => Promise<void>;
	onIconColorChange: CategoryIconsDropdownTypes["onIconColorChange"];
	onIconSelect: (value: string, id: number) => void;
	isLoadingCategories?: boolean;
};

const SidePane = (props: SidePaneTypes) => {
	const {
		onBookmarksDrop,
		onCategoryOptionClick,
		onIconSelect,
		onAddNewCategory,
		onIconColorChange,
		isLoadingCategories = false,
	} = props;

	return (
		<nav className="border-gray-alpha-50 bg-gray-0 h-full overflow-y-auto border-r border-solid p-2">
			<SidePaneUserDropdown />
			<SidePaneOptionsMenu />
			<SidePaneCollectionsList
				onAddNewCategory={onAddNewCategory}
				onBookmarksDrop={onBookmarksDrop}
				onCategoryOptionClick={onCategoryOptionClick}
				onIconColorChange={onIconColorChange}
				onIconSelect={(value, id) => onIconSelect(value, id)}
				isLoadingCategories={isLoadingCategories}
			/>
			<SidePaneTypesList />
		</nav>
	);
};

// Memoize the component to prevent unnecessary re-renders
export default memo(SidePane);
