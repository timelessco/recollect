import classNames from "classnames";
import { useTheme } from "next-themes";

import { colorPickerColors } from "@/utils/constants";

type ColorPickerProps = {
	onChange: (value: string) => void;
	selectedColor: string;
};

const colorBlockWrapper = classNames(
	"flex",
	"cursor-pointer",
	"items-center",
	"space-x-1",
);

const colorBlockSelected = ({
	colorItem,
	selectedColor,
}: {
	colorItem: string;
	selectedColor: string;
}) =>
	classNames("rounded-md", "p-1", "hover:bg-gray-200", {
		"bg-gray-200": colorItem === selectedColor,
	});

const colorBlockItemBorder = (colorItem: string, baseLightColor: string) =>
	classNames(
		"h-4",
		"w-4",
		"rounded-full",
		"border",
		"p-1",
		{ "border-gray-900": colorItem === baseLightColor },
		{ "border-transparent": colorItem !== baseLightColor },
	);

export const ColorPicker = ({ onChange, selectedColor }: ColorPickerProps) => {
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	// Swap first two colors (white/black) in dark mode for better visibility.
	const displayColors =
		isDark && colorPickerColors.length >= 2
			? [
					colorPickerColors[1],
					colorPickerColors[0],
					...colorPickerColors.slice(2),
				]
			: colorPickerColors;

	const swapFirstTwo = (color: string) => {
		if (!isDark || colorPickerColors.length < 2) {
			return color;
		}

		if (color === colorPickerColors[0]) {
			return colorPickerColors[1];
		}

		if (color === colorPickerColors[1]) {
			return colorPickerColors[0];
		}

		return color;
	};

	const mappedSelected = swapFirstTwo(selectedColor);

	const baseLightColor = colorPickerColors[0];

	return (
		<div className={colorBlockWrapper}>
			{displayColors?.map((colorItem) => (
				<div
					className={colorBlockSelected({
						colorItem,
						selectedColor: mappedSelected,
					})}
					key={colorItem}
				>
					<div
						className={colorBlockItemBorder(colorItem, baseLightColor)}
						onClick={() => onChange(swapFirstTwo(colorItem))}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onChange(swapFirstTwo(colorItem));
							}
						}}
						aria-label={`Select ${colorItem} color`}
						aria-pressed={colorItem === mappedSelected}
						role="button"
						style={{ backgroundColor: colorItem }}
						tabIndex={0}
					/>
				</div>
			))}
		</div>
	);
};
