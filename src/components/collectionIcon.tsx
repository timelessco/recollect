import { find } from "lodash";
import { useTheme } from "next-themes";

import { type CategoriesData } from "../types/apiTypes";
import { options } from "../utils/commonData";
import { colorPickerColors } from "../utils/constants";

// --- Utility: normalize color ---
const normalizeColor = (color?: string) => {
	if (!color) {
		return "";
	}

	return color.trim().toLowerCase();
};

// --- Utility: adjust color based on dark mode ---
const getAdjustedColor = (color?: string, isDarkMode?: boolean) => {
	const colorNorm = normalizeColor(color);

	const isWhite =
		colorNorm === "#fff" || colorNorm === "#ffffff" || colorNorm === "white";
	const isBlack =
		colorNorm === "#000" || colorNorm === "#000000" || colorNorm === "black";

	if (isDarkMode) {
		if (isWhite) {
			return "#000000";
		}

		if (isBlack) {
			return "#ffffff";
		}
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
	const isDarkMode =
		resolvedTheme === "dark" ||
		(!resolvedTheme &&
			typeof document !== "undefined" &&
			document.documentElement.classList.contains("dark"));

	const adjustedBgColor = getAdjustedColor(
		bookmarkCategoryData?.icon_color,
		isDarkMode,
	);
	const matchedIcon = find(
		options(),
		(optionItem) => optionItem?.label === bookmarkCategoryData?.icon,
	);

	// Pick contrasting icon color depending on background
	const iconColor =
		adjustedBgColor === colorPickerColors[0]
			? colorPickerColors[1]
			: colorPickerColors[0];

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
