import { MenuItem } from "ariakit";

import { type ChildrenTypes } from "../../types/componentTypes";

type AriaDropdownMenuTypes = {
	children: ChildrenTypes;
	className?: string;
	onClick: (e: React.MouseEvent<HTMLElement>) => Promise<void> | void;
};

const AriaDropdownMenu = (props: AriaDropdownMenuTypes) => {
	const { onClick, children, className = "" } = props;

	return (
		<MenuItem
			className={`rounded-lg focus-visible:outline-hidden ${className}`}
			onClick={async (event) =>
				await onClick(event as unknown as React.MouseEvent<HTMLElement>)
			}
		>
			{children}
		</MenuItem>
	);
};

export default AriaDropdownMenu;
