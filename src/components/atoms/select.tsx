import { ChangeEvent } from 'react';

interface SelectProps {
  options: Array<{ name: string; value: string | number }>;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  defaultValue: string | number;
  id?: string;
}

const Select = (props: SelectProps) => {
  const { options, onChange, defaultValue, id } = props;
  return (
    <select
      id={id}
      className="mt-1 block rounded-md border-gray-300 py-1 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      onChange={onChange}
      defaultValue={defaultValue}
    >
      {options?.map((item) => {
        return (
          <option key={item?.value} value={item?.value}>
            {item?.name}
          </option>
        );
      })}
    </select>
  );
};

export default Select;
