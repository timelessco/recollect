import * as Ariakit from "@ariakit/react";

import { type ChildrenTypes } from "../types/componentTypes";

type ToolTipTypes = {
	children: ChildrenTypes;
	toolTipContent: ChildrenTypes;
};

const ToolTip = ({ toolTipContent, children }: ToolTipTypes) => (
	<Ariakit.TooltipProvider>
		<Ariakit.TooltipAnchor className="cursor-pointer">
			{children}
		</Ariakit.TooltipAnchor>
		<Ariakit.Tooltip className="z-20 rounded-xl bg-gray-900 px-2 py-1 text-13 font-450 text-gray-0">
			{toolTipContent}
		</Ariakit.Tooltip>
	</Ariakit.TooltipProvider>
);

export default ToolTip;
