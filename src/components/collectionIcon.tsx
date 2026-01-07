import { useTheme } from "next-themes";

import { type CategoriesData } from "../types/apiTypes";
import { iconMap } from "../utils/commonData";
import { BLACK_COLOR, WHITE_COLOR } from "../utils/constants";

/**
 * Swap white/black in dark mode for visibility
 */
const getAdjustedColor = (color: string | undefined, isDarkMode: boolean) => {
	if (!isDarkMode || !color) {
		return color;
	}

	if (color === WHITE_COLOR) {
		return BLACK_COLOR;
	}

	if (color === BLACK_COLOR) {
		return WHITE_COLOR;
	}

	return color;
};

type CollectionIconProps = {
	bookmarkCategoryData: Pick<CategoriesData, "icon_color" | "icon">;
	iconSize?: string;
	size?: string;
};

export const CollectionIcon = ({
	bookmarkCategoryData,
	iconSize = "10",
	size = "14",
}: CollectionIconProps) => {
	const { resolvedTheme } = useTheme();
	const isDarkMode = resolvedTheme === "dark";

	const adjustedBgColor = getAdjustedColor(
		bookmarkCategoryData?.icon_color,
		isDarkMode,
	);

	const matchedIcon = bookmarkCategoryData?.icon
		? iconMap.get(bookmarkCategoryData.icon)
		: undefined;

	const iconColor = adjustedBgColor === WHITE_COLOR ? BLACK_COLOR : WHITE_COLOR;

	return (
		<div
			className="flex items-center justify-center rounded-full"
			style={{
				backgroundColor: adjustedBgColor,
				width: `${size}px`,
				height: `${size}px`,
			}}
		>
			{matchedIcon?.icon(iconColor, iconSize)}
		</div>
	);
};
