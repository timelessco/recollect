import classNames from "classnames";
import { useTheme } from "next-themes";

type ColorPickerProps = {
	colorsList: string[];
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

export const ColorPicker = ({
	colorsList,
	onChange,
	selectedColor,
}: ColorPickerProps) => {
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	// Swap first two colors (white/black) in dark mode for better visibility.
	const displayColors =
		isDark && colorsList.length >= 2
			? [colorsList[1], colorsList[0], ...colorsList.slice(2)]
			: colorsList;

	const swapFirstTwo = (color: string) => {
		if (!isDark || colorsList.length < 2) {
			return color;
		}

		if (color === colorsList[0]) {
			return colorsList[1];
		}

		if (color === colorsList[1]) {
			return colorsList[0];
		}

		return color;
	};

	const mappedSelected = swapFirstTwo(selectedColor);

	const baseLightColor = colorsList[0];

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
