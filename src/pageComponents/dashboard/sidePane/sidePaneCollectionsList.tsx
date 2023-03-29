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
};

const SidePaneCollectionsList = (props: SidePaneCollectionsListTypes) => {
	const {
		onBookmarksDrop,
		onCategoryOptionClick,
		onIconSelect,
		onAddNewCategory,
	} = props;
	return (
		<CollectionsList
			onAddNewCategory={onAddNewCategory}
			onBookmarksDrop={onBookmarksDrop}
			onCategoryOptionClick={onCategoryOptionClick}
			onIconSelect={(value, id) => onIconSelect(value, id)}
		/>
	);
};

export default SidePaneCollectionsList;
