import dynamic from "next/dynamic";

import SidePaneOptionsMenu from "./sidePaneOptionsMenu";
import SidePaneTypesList from "./sidePaneTypesList";
import SidePaneUserDropdown from "./sidePaneUserDropdown";

const CollectionsList = dynamic(() => import("./collectionsList"), {
  ssr: false,
});

interface SidePaneTypes {
  onBookmarksDrop: (e: any) => Promise<void>;
  onCategoryOptionClick: (
    value: string | number,
    current: boolean,
    id: number,
  ) => Promise<void>;
  onIconSelect: (value: string, id: number) => void;
  onAddNewCategory: (value: string) => Promise<void>;
}

const SidePane = (props: SidePaneTypes) => {
  const {
    onBookmarksDrop,
    onCategoryOptionClick,
    onIconSelect,
    onAddNewCategory,
  } = props;

  return (
    <nav className="h-full border-r-[0.5px] border-r-custom-gray-4 p-2">
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
