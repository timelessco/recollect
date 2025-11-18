import { memo } from "react";

import CollectionsList from "./collectionsList";
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
	isLoadingCategories?: boolean;
	isFetchingCategories?: boolean;
};

const SidePane = (props: SidePaneTypes) => {
	const {
		onBookmarksDrop,
		onCategoryOptionClick,
		onAddNewCategory,
		isLoadingCategories = false,
		isFetchingCategories = false,
	} = props;

	return (
		<nav className="h-full overflow-y-auto bg-gray-0 p-2">
			<SidePaneUserDropdown />

			<SidePaneOptionsMenu />

			<CollectionsList
				onAddNewCategory={onAddNewCategory}
				onBookmarksDrop={onBookmarksDrop}
				onCategoryOptionClick={onCategoryOptionClick}
				isLoadingCategories={isLoadingCategories}
				isFetchingCategories={isFetchingCategories}
			/>

			<SidePaneTypesList />
		</nav>
	);
};

// Memoize the component to prevent unnecessary re-renders
export default memo(SidePane);
