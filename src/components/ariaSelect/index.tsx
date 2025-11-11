import {
	Select,
	SelectItem,
	// SelectLabel,
	SelectPopover,
	useSelectState,
} from "ariakit/select";

import { type ChildrenTypes } from "../../types/componentTypes";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../utils/commonClassNames";

type AriaSelectProps = {
	defaultValue: string;
	disabled?: boolean;
	menuClassName?: string;
	onOptionClick: (value: string) => void;
	options: Array<{ label: string; value: string }>;
	renderCustomSelectButton?: (value: boolean) => ChildrenTypes;
	renderCustomSelectItem?: (value: string) => ChildrenTypes;
};

const AriaSelect = (props: AriaSelectProps) => {
	const {
		options,
		defaultValue,
		disabled = false,
		onOptionClick,
		renderCustomSelectItem = () => undefined,
		renderCustomSelectButton = () => undefined,
		menuClassName,
	} = props;
	const select = useSelectState({
		defaultValue,
		sameWidth: false,
		gutter: 2,
	});
	return (
		<>
			<Select
				className="text-13 outline-hidden flex appearance-none items-center justify-between rounded-lg font-medium leading-4"
				disabled={disabled}
				state={select}
			>
				{renderCustomSelectButton(select?.open) ?? defaultValue}
			</Select>
			<SelectPopover
				className={`${menuClassName ?? dropdownMenuClassName} z-50`}
				state={select}
			>
				{options?.map((item) => (
					// return (
					//   <SelectItem
					// className={dropdownMenuItemClassName}
					// value={item.value}
					// onClick={() => onOptionClick(item.value)}
					//   />
					// );
					<SelectItem
						className={dropdownMenuItemClassName}
						key={item.value}
						onClick={() => onOptionClick(item.value)}
						value={item.value}
					>
						{renderCustomSelectItem(item?.label) ?? item.value}
					</SelectItem>
				))}
			</SelectPopover>
		</>
	);
};

export default AriaSelect;
