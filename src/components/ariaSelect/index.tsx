import {
  Select,
  SelectItem,
  // SelectLabel,
  SelectPopover,
  useSelectState,
} from "ariakit/select";

import {
  dropdownMenuClassName,
  dropdownMenuItemClassName,
} from "../../utils/commonClassNames";

interface AriaSelectProps {
  options: { label: string; value: string }[];
  defaultValue: string;
  disabled?: boolean;
  onOptionClick: (value: string) => void;
}

const AriaSelect = (props: AriaSelectProps) => {
  const { options, defaultValue, disabled = false, onOptionClick } = props;
  const select = useSelectState({
    defaultValue,
    sameWidth: false,
    gutter: 2,
  });
  return (
    <>
      <Select
        state={select}
        className="my-select flex appearance-none items-center justify-between text-13 font-medium leading-4 text-custom-gray-1 disabled:opacity-50"
        disabled={disabled}
      />
      <SelectPopover state={select} className={`${dropdownMenuClassName} z-50`}>
        {options?.map(item => {
          return (
            <SelectItem
              className={dropdownMenuItemClassName}
              value={item.value}
              onClick={() => onOptionClick(item.value)}
            />
          );
        })}
      </SelectPopover>
    </>
  );
};

export default AriaSelect;
