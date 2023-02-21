import { ExclamationCircleIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import omit from "lodash/omit";
import React, { type InputHTMLAttributes } from "react";

import type { ChildrenTypes } from "../../types/componentTypes";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  placeholder: string;
  className: string;
  isError: boolean;
  errorText: string;
  isDisabled?: boolean;
  id?: string;
  wrapperClassName?: string;
  rendedRightSideElement?: ChildrenTypes;
  errorClassName?: string;
  errorIconClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    placeholder,
    value,
    onChange,
    onKeyUp,
    className = "",
    isError,
    errorText = "",
    isDisabled = false,
    id = "",
    wrapperClassName = "relative mt-1 rounded-md shadow-sm",
    rendedRightSideElement,
    errorClassName = "",
    errorIconClassName = "",
  } = props;

  const inputClass = classNames(className, {
    "block w-full pr-10 border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500 rounded-md":
      isError,
    "shadow-sm block w-full border-gray-300 rounded-md": !isError,
    "disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none":
      isDisabled,
  });

  const errorClass = classNames(errorClassName, {
    "mt-2 text-xs text-red-600": true,
  });

  const errorIconClass = classNames(errorIconClassName, {
    "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3":
      true,
  });

  return (
    <div className="w-full">
      <div className={wrapperClassName}>
        <input
          id={id}
          ref={ref}
          type="text"
          value={value}
          {...omit(props, ["isError", "errorText", "isDisabled"])}
          placeholder={placeholder}
          className={inputClass}
          onChange={onChange}
          onKeyUp={onKeyUp}
          disabled={isDisabled}
        />
        {isError && (
          <div className={errorIconClass}>
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          </div>
        )}
        {rendedRightSideElement && rendedRightSideElement}
      </div>
      {isError && (
        <p className={errorClass} id="email-error">
          {errorText}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
