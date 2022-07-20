import { ExclamationCircleIcon } from '@heroicons/react/solid';
import React, { InputHTMLAttributes } from 'react';
import classNames from 'classnames';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  className: string;
  isError: boolean;
}

const Input = (props: InputProps) => {
  const {
    placeholder,
    value,
    onChange,
    onKeyUp,
    className = '',
    isError,
  } = props;

  const inputClass = classNames(className, {
    'block w-full pr-10 border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md':
      isError,
    'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md':
      !isError,
  });

  return (
    <div>
      <div className="mt-1 relative rounded-md shadow-sm">
        <input
          type="text"
          className={inputClass}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyUp={onKeyUp}
          aria-invalid="true"
          aria-describedby="email-error"
        />
        {isError && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
      {isError && (
        <p className="mt-2 text-sm text-red-600" id="email-error">
          Your password must be less than 4 characters.
        </p>
      )}
    </div>
  );
};

export default Input;
