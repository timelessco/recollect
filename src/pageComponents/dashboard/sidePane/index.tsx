import { memo } from "react";

import CollectionsList from "./collectionsList";
import SidePaneOptionsMenu from "./sidePaneOptionsMenu";
import SidePaneTypesList from "./sidePaneTypesList";
import SidePaneUserDropdown from "./sidePaneUserDropdown";

const SidePane = () => (
	<nav className="h-full overflow-y-auto border-r border-solid border-gray-alpha-50 bg-gray-0 p-2">
		<SidePaneUserDropdown />

		<SidePaneOptionsMenu />

		<CollectionsList />

		<SidePaneTypesList />
	</nav>
);

// Memoize the component to prevent unnecessary re-renders
export default memo(SidePane);
