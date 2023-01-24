import CollectionsList from './collectionsList';

interface SidePaneCollectionsListTypes {
  onBookmarksDrop: (e: any) => Promise<void>;
  onCategoryOptionClick: (
    value: string | number,
    current: boolean,
    id: number
  ) => void;
  onIconSelect: (value: string, id: number) => void;
  onAddNewCategory: (value: string) => void;
}

const SidePaneCollectionsList = (props: SidePaneCollectionsListTypes) => {
  const {
    onBookmarksDrop,
    onCategoryOptionClick,
    onIconSelect,
    onAddNewCategory,
  } = props;
  return (
    <CollectionsList
      onBookmarksDrop={onBookmarksDrop}
      onCategoryOptionClick={onCategoryOptionClick}
      onIconSelect={(value, id) => onIconSelect(value, id)}
      onAddNewCategory={onAddNewCategory}
    />
  );
};

export default SidePaneCollectionsList;
