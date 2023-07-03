type ColorPickerProps = {
	colorsList: string[];
	onChange: (value: string) => void;
	selectedColor: string;
};

const ColorPicker = ({
	colorsList,
	onChange,
	selectedColor,
}: ColorPickerProps) => (
	<div className="flex cursor-pointer items-center space-x-3">
		{colorsList?.map((colorItem) => (
			<div
				className={`rounded-md p-1 hover:bg-custom-gray-7 ${
					colorItem === selectedColor ? "bg-custom-gray-7" : ""
				}`}
				key={colorItem}
			>
				<div
					className="h-4 w-4 rounded-full border-[1px] border-gray-900 p-1"
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
