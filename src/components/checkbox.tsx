import { type ComponentProps } from "react";
import { Checkbox as AriaCheckbox } from "ariakit/checkbox";

type CheckboxPropsTypes = ComponentProps<typeof AriaCheckbox> & {
	checked: boolean;
	classname?: string | ((props: { isPressed: boolean }) => string);
	disabled?: boolean;
	label?: string;
	onChange?: (value: number | string) => void;
	showPlaceholder?: boolean;
	value: number | string;
};

const Checkbox = (props: CheckboxPropsTypes) => {
	const {
		label = "",
		value,
		onChange = () => {},
		checked,
		disabled = false,
		classname,
		showPlaceholder = false,
		...rest
	} = props;

	return (
		<label
			className={`flex cursor-pointer items-center justify-center ${classname}`}
		>
			<AriaCheckbox
				checked={checked}
				className={`aria-checkbox h-4 w-4 ${
					showPlaceholder ? "opacity-0" : ""
				}`}
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				value={value}
				{...rest}
			/>
			{showPlaceholder && (
				<div className="checkbox-div pointer-events-none absolute left-4 h-4 w-4" />
			)}
			<span
				// eslint-disable-next-line tailwindcss/no-custom-classname
				className={`checkmark ml-3 text-sm leading-[21px] text-gray-light-12  ${
					disabled ? "opacity-50" : ""
				}`}
			>
				{label}
			</span>
		</label>
	);
};

export default Checkbox;
