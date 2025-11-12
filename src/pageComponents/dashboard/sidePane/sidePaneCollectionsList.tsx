import { type CategoryIconsDropdownTypes } from "../../../types/componentTypes";

import CollectionsList from "./collectionsList";

type SidePaneCollectionsListTypes = {
	onAddNewCategory: (value: string) => Promise<void>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onBookmarksDrop: (event: any) => Promise<void>;
	onCategoryOptionClick: (
		value: number | string,
		current: boolean,
		id: number,
	) => Promise<void>;
	onIconSelect: (value: string, id: number) => void;
	isLoadingCategories?: boolean;
	isFetchingCategories?: boolean;
	onIconColorChange: CategoryIconsDropdownTypes["onIconColorChange"];
};

const SidePaneCollectionsList = (props: SidePaneCollectionsListTypes) => {
	const {
		onBookmarksDrop,
		onCategoryOptionClick,
		onIconSelect,
		onAddNewCategory,
		isLoadingCategories,
		isFetchingCategories,
		onIconColorChange,
	} = props;
	return (
		<CollectionsList
			onAddNewCategory={onAddNewCategory}
			onBookmarksDrop={onBookmarksDrop}
			onCategoryOptionClick={onCategoryOptionClick}
			onIconSelect={(value, id) => onIconSelect(value, id)}
			isLoadingCategories={isLoadingCategories}
			isFetchingCategories={isFetchingCategories}
			onIconColorChange={onIconColorChange}
		/>
	);
};

export default SidePaneCollectionsList;
