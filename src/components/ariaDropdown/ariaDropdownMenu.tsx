import { MenuItem } from "ariakit";

import { type ChildrenTypes } from "../../types/componentTypes";

type AriaDropdownMenuTypes = {
	children: ChildrenTypes;
	className?: string;
	onClick: () => Promise<void> | void;
};

const AriaDropdownMenu = (props: AriaDropdownMenuTypes) => {
	const { onClick, children, className = "" } = props;

	return (
		<MenuItem
			className={`rounded-lg  focus-visible:outline-none ${className}`}
			onClick={onClick}
		>
			{children}
		</MenuItem>
	);
};

export default AriaDropdownMenu;
