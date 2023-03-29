import dynamic from "next/dynamic";

import SidePaneOptionsMenu from "./sidePaneOptionsMenu";
import SidePaneTypesList from "./sidePaneTypesList";
import SidePaneUserDropdown from "./sidePaneUserDropdown";

const CollectionsList = dynamic(() => import("./collectionsList"), {
	ssr: false,
});

type SidePaneTypes = {
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
				onAddNewCategory={onAddNewCategory}
				onBookmarksDrop={onBookmarksDrop}
				onCategoryOptionClick={onCategoryOptionClick}
				onIconSelect={(value, id) => onIconSelect(value, id)}
			/>
			<SidePaneTypesList />
		</nav>
	);
};

export default SidePane;
