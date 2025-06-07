import React, { useState } from "react";

export const ToggleableCheckbox = () => {
	const [checked, setChecked] = useState(false);

	const handleClick = () => {
		const newChecked = !checked;
		setChecked(newChecked);
	};

	return (
		<input
			checked={checked}
			className="h-4 w-4 cursor-pointer"
			onChange={handleClick}
			type="checkbox"
		/>
	);
};
