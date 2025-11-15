"use client";

import {
	composeRenderProps,
	Checkbox as RACCheckbox,
	type CheckboxRenderProps,
	type CheckboxProps as RACCheckboxProps,
	type RenderProps,
} from "react-aria-components";

import { CheckIcon } from "@/icons/check-icon";
import { focusRing, renderSlot } from "@/utils/react-aria-utils";
import { tv } from "@/utils/tailwind-merge";

const checkboxStyles = tv({
	base: "group relative flex cursor-pointer items-center justify-center",
});

export interface CheckboxProps extends RACCheckboxProps {
	boxSlot?: RenderProps<CheckboxRenderProps>["children"];
}

export function Checkbox(props: CheckboxProps) {
	const { boxSlot = CheckboxBoxSlot, className, children, ...rest } = props;

	return (
		<RACCheckbox
			{...rest}
			className={composeRenderProps(className, (className, renderProps) =>
				checkboxStyles({ ...renderProps, className }),
			)}
		>
			{composeRenderProps(children, (children, renderProps) => (
				<>
					{renderSlot(boxSlot, renderProps)}

					{children}
				</>
			))}
		</RACCheckbox>
	);
}

export const checkboxBoxStyles = tv({
	extend: focusRing,
	base: "box-border flex size-[26px] shrink-0 items-center justify-center rounded-lg backdrop-blur-[10px] transition",
	variants: {
		isSelected: {
			false: "bg-whites-700 text-blacks-800",
			true: "bg-blacks-700 text-whites-800",
		},
	},
});

function CheckboxBoxSlot(props: CheckboxRenderProps) {
	const { isSelected, isIndeterminate, ...renderRest } = props;

	return (
		<div
			className={checkboxBoxStyles({
				isSelected: isSelected || isIndeterminate,
				...renderRest,
			})}
		>
			{/* {isIndeterminate ? (
					<Minus aria-hidden className={iconStyles} />
				) :  */}
			<CheckIcon aria-hidden className="text-sm" />
		</div>
	);
}
