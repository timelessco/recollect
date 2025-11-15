"use client";

import {
	Checkbox as AriaCheckbox,
	composeRenderProps,
	useRenderProps,
	type CheckboxProps as AriaCheckboxProps,
	type CheckboxRenderProps,
	type RenderProps,
} from "react-aria-components";

import { CheckIcon } from "@/icons/check-icon";
import { focusRing } from "@/utils/react-aria-utils";
import { tv } from "@/utils/tailwind-merge";

const checkboxStyles = tv({
	base: "group relative flex cursor-pointer items-center justify-center",
});

export interface CheckboxProps extends AriaCheckboxProps {
	boxSlot?: RenderProps<CheckboxRenderProps>["children"];
}

export function Checkbox(props: CheckboxProps) {
	const { boxSlot, className, children, ...rest } = props;

	return (
		<AriaCheckbox
			{...rest}
			className={composeRenderProps(className, (className, renderProps) =>
				checkboxStyles({ ...renderProps, className }),
			)}
		>
			{composeRenderProps(children, (children, renderProps) => (
				<>
					<CheckboxBoxSlot renderProps={renderProps} boxSlot={boxSlot} />

					{children}
				</>
			))}
		</AriaCheckbox>
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

interface CheckboxBoxSlotProps {
	renderProps: CheckboxRenderProps;
	boxSlot: RenderProps<CheckboxRenderProps>["children"];
}

function CheckboxBoxSlot(props: CheckboxBoxSlotProps) {
	const { renderProps: checkboxRenderProps, boxSlot } = props;
	const renderProps = useRenderProps({
		children: boxSlot,
		values: { ...checkboxRenderProps },
	});

	if (boxSlot) {
		return <>{renderProps.children}</>;
	}

	const { isSelected, isIndeterminate, ...renderRest } = checkboxRenderProps;
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
