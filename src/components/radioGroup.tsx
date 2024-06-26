import { type RefObject } from "react";
import {
	RadioGroup as AriaRadioGroup,
	Radio,
	useRadioState,
} from "ariakit/radio";
import classNames from "classnames";

import TickIcon from "../icons/tickIcon";
import { type ChildrenTypes } from "../types/componentTypes";

type RadioGroupProps = {
	disabled?: boolean;
	initialRadioRef?:
		| RefObject<HTMLInputElement>
		| ((instance: HTMLInputElement | null) => void)
		| null
		| undefined;
	onChange: (value: string) => void;
	radioList: Array<{ icon: ChildrenTypes; label: string; value: string }>;
	value: string;
};

const RadioGroup = (props: RadioGroupProps) => {
	const {
		radioList,
		onChange,
		value,
		initialRadioRef,
		disabled = false,
	} = props;
	const radio = useRadioState();

	const radioGroupClassNames = classNames("dropdown-container flex flex-col", {
		"opacity-40": disabled,
	});

	const radioClassNames = classNames(
		"flex items-center justify-between rounded-lg px-2 py-[5px] text-sm leading-4 text-custom-gray-1 hover:bg-gray-light-4",
		{
			"cursor-not-allowed": disabled,
			"cursor-pointer": !disabled,
		},
	);

	return (
		<AriaRadioGroup
			className={radioGroupClassNames}
			disabled={disabled}
			state={radio}
		>
			{radioList?.map((item) => {
				const isRadioSelected = value === item?.value;
				return (
					<label className={radioClassNames} key={item?.value}>
						<div className="flex items-center text-[13px] font-450 text-custom-gray-1">
							<figure className="mr-2 flex h-4 w-4 items-center justify-center">
								{item?.icon}
							</figure>
							<Radio
								checked={isRadioSelected}
								onChange={(event) =>
									onChange((event.target as HTMLInputElement).value)
								}
								ref={isRadioSelected ? initialRadioRef : null}
								value={item?.value}
							/>
							{item?.label}
						</div>
						{isRadioSelected && (
							<figure>
								<TickIcon />
							</figure>
						)}
					</label>
				);
			})}
		</AriaRadioGroup>
	);
};

RadioGroup.displayName = "RadioGroup";

export default RadioGroup;
