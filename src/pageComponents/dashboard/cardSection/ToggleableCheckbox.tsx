import React, { useRef } from "react";
import { useCheckbox } from "react-aria";
import { type ToggleState } from "react-stately";

type ToggleableCheckboxProps = {
	id: string;
	isSelected: boolean;
	onChange: (id: string, isSelected: boolean) => void;
};

export const ToggleableCheckbox = ({
	id,
	isSelected,
	onChange,
}: ToggleableCheckboxProps) => {
	const ref = useRef<HTMLInputElement>(null);

	const state: ToggleState = {
		isSelected,
		setSelected: (selected: boolean) => onChange(id, selected),
		toggle: () => onChange(id, !isSelected),
	};

	const { inputProps } = useCheckbox(
		{
			isSelected,
			onChange: () => state.toggle(),
		},
		state,
		ref,
	);

	return (
		<input
			{...inputProps}
			className="h-4 w-4 cursor-pointer"
			onClick={(event) => {
				event.stopPropagation();
				state.toggle();
			}}
			ref={ref}
			type="checkbox"
		/>
	);
};
