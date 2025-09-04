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
		onChange = () => {},
		checked,
		disabled = false,
		classname,
		BookmarkHoverCheckbox = false,
		...rest
	} = props;

	return (
		<label
			className={`flex cursor-pointer items-center justify-center ${classname} backdrop-blur-[10px] `}
		>
			<AriaCheckbox
				checked={checked}
				className="aria-checkbox absolute right-1 top-[0.5px] h-[26px] w-[26px] opacity-0"
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				value={value}
				{...rest}
			/>
			{BookmarkHoverCheckbox ? (
				<div className="checkbox-div pointer-events-none absolute left-[5px] h-4 w-4 rounded-[4px] bg-black " />
			) : checked ? (
				<div className="checkbox-div pointer-events-none absolute right-1 top-[0.5px] h-[26px] w-[26px] rounded-lg bg-black/70 backdrop-blur-[10px]" />
			) : (
				<div className="pointer-events-none absolute right-1 top-[0.5px] flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-white/90 backdrop-blur-[10px]">
					<CheckboxIcon />
				</div>
			)}
			<span
				// eslint-disable-next-line tailwindcss/no-custom-classname
				className={`checkmark ml-8 text-sm leading-[21px] text-gray-light-12 ${
					disabled ? "opacity-50" : ""
				}`}
			>
				{label}
			</span>
		</label>
	);
};

export default Checkbox;
