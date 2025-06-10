import React, { type ComponentProps } from "react";

type ToggleableCheckboxProps = Omit<ComponentProps<"input">, "onChange"> & {
	checked: boolean;
};

export const ToggleableCheckbox = ({ ...props }: ToggleableCheckboxProps) => (
	<input type="checkbox" {...props} />
);
