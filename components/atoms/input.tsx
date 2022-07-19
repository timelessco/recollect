import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  className: string;
}

const Input = (props: InputProps) => {
  const { placeholder, value, onChange, onKeyUp, className } = props;

  return (
    <>
      <input
        className={`${className} shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyUp={onKeyUp}
        type="text"
      />
    </>
  );
};

export default Input;
