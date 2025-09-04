import { find } from "lodash";

import { type CategoriesData } from "../types/apiTypes";
import { options } from "../utils/commonData";
import { colorPickerColors } from "../utils/constants";

type CollectionIconProps = {
	bookmarkCategoryData: Pick<CategoriesData, "icon_color" | "icon">;
	iconSize?: string;
	size?: string;
};

export const CollectionIcon = ({
	bookmarkCategoryData,
	iconSize = "10",
	size = "14",
}: CollectionIconProps) => (
	<div
		className="flex items-center justify-center rounded-full"
		style={{
			backgroundColor: bookmarkCategoryData?.icon_color,
			width: `${size}px`,
			height: `${size}px`,
		}}
	>
		{find(
			options(),
			(optionItem) => optionItem?.label === bookmarkCategoryData?.icon,
		)?.icon(
			bookmarkCategoryData?.icon_color === colorPickerColors[0]
				? colorPickerColors[1]
				: colorPickerColors[0],
			iconSize,
		)}
	</div>
);
