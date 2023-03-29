import { MenuItem } from "ariakit";

import { type ChildrenTypes } from "../../types/componentTypes";

type AriaDropdownMenuTypes = {
	children: ChildrenTypes;
	onClick: () => Promise<void> | void;
};

const AriaDropdownMenu = (props: AriaDropdownMenuTypes) => {
	const { onClick, children } = props;

	return (
		<MenuItem
			className="rounded-lg hover:bg-custom-gray-9 focus:bg-custom-gray-9 focus-visible:outline-none"
			onClick={onClick}
		>
			{children}
		</MenuItem>
	);
};

export default AriaDropdownMenu;
