import {
  RadioGroup as AriaRadioGroup,
  Radio,
  useRadioState,
} from "ariakit/radio";
import React from "react";

interface RadioGroupProps {
  radioList: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  value: string;
  initialRadioRef?:
    | ((instance: HTMLInputElement | null) => void)
    | React.RefObject<HTMLInputElement>
    | null
    | undefined;
}

const RadioGroup = (props: RadioGroupProps) => {
  const { radioList, onChange, value, initialRadioRef } = props;
  const radio = useRadioState();
  return (
    <AriaRadioGroup state={radio} className="flex flex-col">
      {radioList?.map(item => {
        const isRadioSelected = value === item?.value;
        return (
          // as per docs htmlFor is not needed ref: https://ariakit.org/components/radio
          // eslint-disable-next-line jsx-a11y/label-has-associated-control
          <label
            key={item?.value}
            className="flex p-2 text-sm leading-4 text-custom-gray-1"
          >
            <Radio
              className="mr-1 h-4 w-4 border-gray-300 text-indigo-600 transition-all duration-200 ease-in-out focus:ring-indigo-500"
              value={item?.value}
              onChange={e => onChange((e.target as HTMLInputElement).value)}
              checked={isRadioSelected}
              ref={isRadioSelected ? initialRadioRef : null}
            />
            {item?.label}
          </label>
        );
      })}
    </AriaRadioGroup>
  );
};

RadioGroup.displayName = "RadioGroup";

export default RadioGroup;
