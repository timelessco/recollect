import React, { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onKeyUp:(e: React.KeyboardEvent<HTMLInputElement>) => void
}

const Input = (props: InputProps) => {

  const { placeholder, value, onChange, onKeyUp } = props

  return (
    <input
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyUp={onKeyUp}
    />
  );
};

export default Input;
