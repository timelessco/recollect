import { Checkbox as AriaCheckbox } from 'ariakit/checkbox';

interface CheckboxPropsTypes {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  checked: boolean;
  disabled?: boolean;
}

export default function Checkbox(props: CheckboxPropsTypes) {
  const { label, value, onChange, checked, disabled = false } = props;

  return (
    <label className="flex items-center p-2">
      <AriaCheckbox
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
        onChange={(e) => onChange(e.target.value)}
        value={value}
        checked={checked}
        disabled={disabled}
      />{' '}
      <span
        className={`text-custom-gray-1 text-sm leading-4 ml-1 ${
          disabled ? 'opacity-50' : ''
        }`}
      >
        {label}
      </span>
    </label>
  );
}
