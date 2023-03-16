import { Checkbox as AriaCheckbox } from "ariakit/checkbox";

interface CheckboxPropsTypes {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  checked: boolean;
  disabled?: boolean;
}

const Checkbox = (props: CheckboxPropsTypes) => {
  const { label, value, onChange, checked, disabled = false } = props;

  return (
    // disabling this because as per docs htmlFor is not needed
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label className="flex items-center">
      <AriaCheckbox
        // className="h-4 w-4 rounded border-gray-300 text-custom-gray-5  transition-all duration-200 ease-in-out  disabled:opacity-50"
        onChange={e => onChange(e.target.value)}
        value={value}
        checked={checked}
        disabled={disabled}
      />
      <span
        className={`ml-3 text-sm leading-[21px] text-custom-gray-5 ${
          disabled ? "opacity-50" : ""
        }`}
      >
        {label}
      </span>
    </label>
  );
};

export default Checkbox;
