import SidePaneUserDropdown from './sidePaneUserDropdown';

const SidePane = () => {
  return (
    <nav className="p-2 border-r-[0.5px] border-r-custom-gray-4 h-full">
      <SidePaneUserDropdown />
      {/* {renderSidePaneUserDropdown()} */}
      {/* {renderSidePaneOptionsMenu()}
      <CollectionsList
        onBookmarksDrop={onBookmarksDrop}
        onCategoryOptionClick={onCategoryOptionClick}
        onIconSelect={(value, id) => onIconSelect(value, id)}
        onAddNewCategory={onAddNewCategory}
      /> */}
    </nav>
  );
};

export default SidePane;
