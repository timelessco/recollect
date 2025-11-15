import { type ComponentProps } from "react";
import { Checkbox as AriaCheckbox } from "ariakit/checkbox";

import { CheckboxIcon } from "../icons/checkboxIcon";

type CheckboxPropsTypes = ComponentProps<typeof AriaCheckbox> & {
	BookmarkHoverCheckbox?: boolean;
	checked: boolean;
	classname?: string;
	disabled?: boolean;
	label?: string;
	onChange?: (value: number | string) => void;
	value: number | string;
};

const Checkbox = (props: CheckboxPropsTypes) => {
	const {
		label = "",
		value,
		checked,
		disabled = false,
		classname,
		BookmarkHoverCheckbox = false,
		...rest
	} = props;

	return (
		<label
			className={`flex cursor-pointer items-center justify-center ${classname} backdrop-blur-[10px]`}
		>
			<AriaCheckbox
				checked={checked}
				className="aria-checkbox absolute top-[0.5px] right-1 h-[26px] w-[26px] opacity-0"
				disabled={disabled}
				value={value}
				{...rest}
			/>
			{BookmarkHoverCheckbox ? (
				<div className="checkbox-div pointer-events-none absolute left-[5px] h-4 w-4 rounded-[4px] bg-plain" />
			) : checked ? (
				<div className="pointer-events-none absolute top-0 right-1 flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-blacks-700 text-whites-800 backdrop-blur-[10px]">
					<CheckboxIcon />
				</div>
			) : (
				<div className="pointer-events-none absolute top-0 right-1 flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-whites-700 text-blacks-800 backdrop-blur-[10px]">
					<CheckboxIcon />
				</div>
			)}
			<span
				className={`ml-8 text-sm leading-[21px] text-gray-900 ${
					disabled ? "opacity-50" : ""
				}`}
			>
				{label}
			</span>
		</label>
	);
};

export default Checkbox;
