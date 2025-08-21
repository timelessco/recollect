import { type ComponentProps } from "react";
import { Checkbox as AriaCheckbox } from "ariakit/checkbox";

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
			className={`flex cursor-pointer items-center justify-center ${classname}`}
		>
			<AriaCheckbox
				checked={checked}
				className="aria-checkbox h-5 w-5 opacity-0"
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				value={value}
				{...rest}
			/>
			{BookmarkHoverCheckbox ? (
				<div className="checkbox-div pointer-events-none absolute left-4 h-4 w-4 bg-black" />
			) : (
				<div
					className={`checkbox-div pointer-events-none absolute  left-0 h-[26px] w-[26px] rounded-lg backdrop-blur-[10px] ${
						checked ? "bg-[rgba(0,0,0.7)]" : "bg-[rgba(255,255,255,0.9)]"
					}`}
				/>
			)}
			<span
				// eslint-disable-next-line tailwindcss/no-custom-classname
				className={`checkmark ml-3 rounded-lg text-sm leading-[21px] text-gray-light-12 ${
					disabled ? "opacity-50" : ""
				}`}
			>
				{label}
			</span>
		</label>
	);
};

export default Checkbox;
