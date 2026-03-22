import type { InputHTMLAttributes } from "react";

import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import omit from "lodash/omit";

import type { ChildrenTypes } from "../../types/componentTypes";

import { cn } from "@/utils/tailwind-merge";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  autoFocus?: boolean;
  className: string;
  errorClassName?: string;
  errorIconClassName?: string;
  errorText: string;
  id?: string;
  isDisabled?: boolean;
  isError: boolean;
  isFullWidth?: boolean;
  placeholder: string;
  rendedRightSideElement?: ChildrenTypes;
  selectTextOnFocus?: boolean;
  showError?: boolean;
  tabIndex?: number;
  type?: string;
  wrapperClassName?: string;
};

const Input = ({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement | null> }) => {
  const {
    autoFocus = true,
    className = "",
    errorClassName = "",
    errorIconClassName = "",
    errorText = "",
    id = "",
    isDisabled = false,
    isError,
    isFullWidth = true,
    onBlur,
    onChange,
    onKeyUp,
    placeholder,
    rendedRightSideElement,
    selectTextOnFocus = false,
    showError = true,
    tabIndex = 0,
    type = "text",
    value,
    wrapperClassName = "relative",
  } = props;

  const inputClass = cn(
    {
      "block w-full border-gray-300": !isError,
      "block w-full border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500 focus:outline-hidden":
        isError,
    },
    className,
  );

  const errorClass = cn("text-xs text-red-600", errorClassName);

  const errorIconClass = cn(
    "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3",
    errorIconClassName,
  );

  return (
    <div className={isFullWidth ? "w-full" : ""}>
      <div className={wrapperClassName}>
        <input
          id={id}
          ref={ref}
          type={type}
          value={value}
          {...omit(props, [
            "isError",
            "errorText",
            "errorClassName",
            "errorIconClassName",
            "isDisabled",
            "isFullWidth",
            "rendedRightSideElement",
            "selectTextOnFocus",
            "showError",
            "wrapperClassName",
          ])}
          autoFocus={autoFocus}
          className={inputClass}
          disabled={isDisabled}
          onBlur={onBlur}
          onChange={onChange}
          onFocus={(event) => {
            if (selectTextOnFocus) {
              event.target.select();
            }
          }}
          onKeyUp={onKeyUp}
          placeholder={placeholder}
          tabIndex={tabIndex}
        />
        {showError && isError && (
          <div className={errorIconClass}>
            <ExclamationCircleIcon aria-hidden="true" className="h-5 w-5 text-red-500" />
          </div>
        )}
        {rendedRightSideElement}
      </div>
      {showError && isError && (
        <p className={errorClass} id="email-error">
          {errorText}
        </p>
      )}
    </div>
  );
};

Input.displayName = "Input";

export default Input;
