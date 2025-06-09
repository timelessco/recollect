import React, { useState, type ComponentProps } from "react";

type ToggleableCheckboxProps = ComponentProps<"input">;

export const ToggleableCheckbox = (props: ToggleableCheckboxProps) => {
	const [checked, setChecked] = useState(false);

	const handleClick = () => {
		const newChecked = !checked;
		setChecked(newChecked);
	};

	return (
		<input
			checked={checked}
			onChange={handleClick}
			type="checkbox"
			{...props}
		/>
	);
};
