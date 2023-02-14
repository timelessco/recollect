import classNames from "classnames";
import React from "react";

import type { ChildrenTypes } from "../../types/componentTypes";
import { tcm } from "../../utils/tailwindMerge";

interface ButtonProps {
  children: ChildrenTypes;
  onClick?: () => void;
  className?: string;
  isDisabled?: boolean;
  type?: "dark" | "light";
  style?: Record<string, unknown>;
  id?: string;
}

const Button: React.FC<ButtonProps> = props => {
  const {
    children,
    onClick,
    className,
    isDisabled = false,
    type = "light",
    id = "",
    style,
  } = props;

  const buttonClassNames = tcm(
    classNames({
      "flex items-center rounded-lg py-[6px] px-2 text-[13px] font-medium leading-[14px]":
        true,
      "bg-custom-gray-5 hover:bg-gray-800": type === "dark",
      "bg-white hover:bg-custom-gray-2": type === "light",
    }),
    className,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClassNames}
      disabled={isDisabled}
      style={style}
      id={id}
    >
      {children}
    </button>
  );
};

export default Button;
