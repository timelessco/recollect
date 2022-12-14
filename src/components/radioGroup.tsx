import {
  Radio,
  RadioGroup as AriaRadioGroup,
  useRadioState,
} from 'ariakit/radio';
import React from 'react';

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

const RadioGroup = React.forwardRef((props: RadioGroupProps) => {
  const { radioList, onChange, value, initialRadioRef } = props;
  const radio = useRadioState();
  return (
    <AriaRadioGroup state={radio} className="flex flex-col">
      {radioList?.map((item) => {
        const isRadioSelected = value === item?.value;
        return (
          <label
            key={item?.value}
            className="p-2 text-custom-gray-1 text-sm leading-4 flex"
          >
            <Radio
              className="mr-1 h-4 w-4 transition-all ease-in-out duration-200 border-gray-300 text-indigo-600 focus:ring-indigo-500"
              value={item?.value}
              onChange={(e) =>
                onChange((e.target as HTMLInputElement).value as string)
              }
              checked={isRadioSelected}
              ref={isRadioSelected ? initialRadioRef : null}
            />
            {item?.label}
          </label>
        );
      })}
    </AriaRadioGroup>
  );
});

RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;
