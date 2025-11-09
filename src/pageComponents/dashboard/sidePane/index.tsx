import dynamic from "next/dynamic";

import { type CategoryIconsDropdownTypes } from "../../../types/componentTypes";

import SidePaneOptionsMenu from "./sidePaneOptionsMenu";
import SidePaneTypesList from "./sidePaneTypesList";
import SidePaneUserDropdown from "./sidePaneUserDropdown";

const CollectionsList = dynamic(async () => await import("./collectionsList"), {
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
		<nav className="h-full overflow-y-auto border-r border-solid border-gray-alpha-50 bg-gray-0 p-2">
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
