import dynamic from "next/dynamic";

import { type CategoryIconsDropdownTypes } from "../../../types/componentTypes";

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
	onIconColorChange: CategoryIconsDropdownTypes["onIconColorChange"];
	onIconSelect: (value: string, id: number) => void;
};

const SidePane = (props: SidePaneTypes) => {
	const {
		onBookmarksDrop,
		onCategoryOptionClick,
		onIconSelect,
		onAddNewCategory,
		onIconColorChange,
	} = props;

	return (
		<nav className="h-full border-r-[1px] border-solid border-r-custom-gray-15 bg-custom-white-1 p-2">
			<SidePaneUserDropdown />
			<SidePaneOptionsMenu />
			<CollectionsList
				onAddNewCategory={onAddNewCategory}
				onBookmarksDrop={onBookmarksDrop}
				onCategoryOptionClick={onCategoryOptionClick}
				onIconColorChange={onIconColorChange}
				onIconSelect={(value, id) => onIconSelect(value, id)}
			/>
			<SidePaneTypesList />
		</nav>
	);
};

export default SidePane;
