import SidePaneUserDropdown from './sidePaneUserDropdown';
import SidePaneOptionsMenu from './sidePaneOptionsMenu';
import CollectionsList from './collectionsList';
import SidePaneTypesList from './sidePaneTypesList';

interface SidePaneTypes {
  onBookmarksDrop: (e: any) => Promise<void>;
  onCategoryOptionClick: (
    value: string | number,
    current: boolean,
    id: number
  ) => void;
  onIconSelect: (value: string, id: number) => void;
  onAddNewCategory: (value: string) => void;
}

const SidePane = (props: SidePaneTypes) => {
  const {
    onBookmarksDrop,
    onCategoryOptionClick,
    onIconSelect,
    onAddNewCategory,
  } = props;

  return (
    <nav className="p-2 border-r-[0.5px] border-r-custom-gray-4 h-full">
      <SidePaneUserDropdown />
      <SidePaneOptionsMenu />
      <CollectionsList
        onBookmarksDrop={onBookmarksDrop}
        onCategoryOptionClick={onCategoryOptionClick}
        onIconSelect={(value, id) => onIconSelect(value, id)}
        onAddNewCategory={onAddNewCategory}
      />
      <SidePaneTypesList />
    </nav>
  );
};

export default SidePane;
