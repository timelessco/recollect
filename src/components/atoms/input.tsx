import { ExclamationCircleIcon } from '@heroicons/react/solid';
import React, { InputHTMLAttributes } from 'react';
import classNames from 'classnames';
import omit from 'lodash/omit';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  // onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // onKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  className: string;
  isError: boolean;
  errorText: string;
  isDisabled?: boolean;
  id?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    placeholder,
    value,
    onChange,
    onKeyUp,
    className = '',
    isError,
    errorText = '',
    isDisabled = false,
    id = '',
  } = props;

  const inputClass = classNames(className, {
    'block w-full pr-10 border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500 rounded-md':
      isError,
    'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full border-gray-300 rounded-md':
      !isError,
    'disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none':
      isDisabled,
  });

  return (
    <div className="w-full">
      <div className="mt-1 relative rounded-md shadow-sm">
        <input
          id={id}
          ref={ref}
          type="text"
          value={value}
          {...omit(props, ['isError', 'errorText', 'isDisabled'])}
          placeholder={placeholder}
          className={inputClass}
          onChange={onChange}
          onKeyUp={onKeyUp}
          disabled={isDisabled}
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
        <p className="mt-2 text-xs text-red-600" id="email-error">
          {errorText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
