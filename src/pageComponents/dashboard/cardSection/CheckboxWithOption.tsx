import { mergeProps, useOption } from "react-aria";
import { type ListState } from "react-stately";

import { ToggleableCheckbox } from "./ToggleableCheckbox";

type CheckboxWithOptionProps = {
	optionState: ListState<unknown>;
	postId: number;
	ref: React.RefObject<HTMLElement>;
};

export const CheckboxWithOption = ({
	optionState,
	postId,
	ref,
}: CheckboxWithOptionProps) => {
	const { optionProps } = useOption({ key: String(postId) }, optionState, ref);
	return <ToggleableCheckbox {...mergeProps(optionProps)} />;
};
