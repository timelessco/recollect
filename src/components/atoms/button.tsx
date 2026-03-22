import type { FC } from "react";

import type { ChildrenTypes } from "../../types/componentTypes";

import { cn } from "../../utils/tailwind-merge";

interface ButtonProps {
  buttonType?: "button" | "reset" | "submit";
  children: ChildrenTypes;
  className?: string;
  disabledClassName?: string;
  id?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  style?: Record<string, unknown>;
  tabIndex?: number;
  title?: string;
  type?: "dark" | "light";
}

const Button: FC<ButtonProps> = (props) => {
  const {
    buttonType = "button",
    children,
    className,
    disabledClassName,
    id = "",
    isActive = false,
    isDisabled = false,
    onClick,
    style,
    tabIndex = -1,
    title = "",
    type = "light",
  } = props;

  const buttonClassNames = cn(
    {
      "bg-gray-100": isActive,
      "bg-gray-950 text-white hover:bg-gray-800": type === "dark",
      "bg-transparent hover:bg-gray-100": type === "light",
      "flex items-center rounded-lg px-2 py-[5px] text-13 leading-[14px] font-medium": true,
    },
    className,
    isDisabled ? disabledClassName : "",
  );

  return (
    <button
      className={buttonClassNames}
      disabled={isDisabled}
      id={id}
      onClick={onClick}
      style={style}
      tabIndex={tabIndex}
      title={title}
      // oxlint-disable-next-line react/button-has-type
      type={buttonType}
    >
      {children}
    </button>
  );
};

export default Button;
