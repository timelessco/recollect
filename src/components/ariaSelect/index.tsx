import {
  Select,
  SelectItem,
  // SelectLabel,
  SelectPopover,
  useSelectState,
} from "ariakit/select";

import type { ChildrenTypes } from "../../types/componentTypes";
import {
  dropdownMenuClassName,
  dropdownMenuItemClassName,
} from "../../utils/commonClassNames";

interface AriaSelectProps {
  options: { label: string; value: string }[];
  defaultValue: string;
  disabled?: boolean;
  onOptionClick: (value: string) => void;
  renderCustomSelectItem?: (value: string) => ChildrenTypes;
  renderCustomSelectButton?: (value: boolean) => ChildrenTypes;
  menuClassName?: string;
}

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
        state={select}
        className="flex appearance-none items-center justify-between rounded-lg text-13 font-medium leading-4 outline-none"
        disabled={disabled}
      >
        {renderCustomSelectButton(select?.open) || defaultValue}
      </Select>
      <SelectPopover
        state={select}
        className={`${menuClassName || dropdownMenuClassName} z-50`}
      >
        {options?.map(item => {
          // return (
          //   <SelectItem
          // className={dropdownMenuItemClassName}
          // value={item.value}
          // onClick={() => onOptionClick(item.value)}
          //   />
          // );
          return (
            <SelectItem
              className={dropdownMenuItemClassName}
              value={item.value}
              onClick={() => onOptionClick(item.value)}
            >
              {renderCustomSelectItem(item?.label) || item.value}
            </SelectItem>
          );
        })}
      </SelectPopover>
    </>
  );
};

export default AriaSelect;
