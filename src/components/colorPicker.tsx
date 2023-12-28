import classNames from "classnames";

import { colorPickerColors } from "../utils/constants";

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
	classNames("rounded-md", "p-1", "hover:bg-custom-gray-7", {
		"bg-custom-gray-7": colorItem === selectedColor,
	});

const colorBlockItemBorder = (colorItem: string) =>
	classNames(
		"h-4",
		"w-4",
		"rounded-full",
		"border-[1px]",
		"p-1",
		{ "border-gray-900": colorItem === colorPickerColors[0] },
		{ "border-transparent": colorItem !== colorPickerColors[0] },
	);

const ColorPicker = ({
	colorsList,
	onChange,
	selectedColor,
}: ColorPickerProps) => (
	<div className={colorBlockWrapper}>
		{colorsList?.map((colorItem) => (
			<div
				className={colorBlockSelected({ colorItem, selectedColor })}
				key={colorItem}
			>
				<div
					className={colorBlockItemBorder(colorItem)}
					onClick={() => onChange(colorItem)}
					onKeyDown={() => {}}
					role="button"
					style={{ backgroundColor: colorItem }}
					tabIndex={0}
				/>
			</div>
		))}
	</div>
);

export default ColorPicker;
