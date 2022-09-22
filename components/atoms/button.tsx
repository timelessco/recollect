import classNames from 'classnames';
import React from 'react';
import { ChildrenTypes } from '../../types/componentTypes';

interface ButtonProps {
  children: ChildrenTypes;
  onClick?: () => void;
  className?: string;
  isDisabled?: boolean;
  type?: 'dark' | 'light';
  style?: Record<string, unknown>;
}

const Button: React.FC<ButtonProps> = (props) => {
  const {
    children,
    onClick,
    className,
    isDisabled = false,
    type = 'light',
    style,
  } = props;

  // const buttonClassNames = classNames(className, {
  //   'text-white bg-gray-700 hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800':
  //     true,
  // });

  const buttonClassNames = classNames(
    {
      'flex items-center rounded-lg py-[6px] px-2 text-[13px] font-medium leading-[14px]':
        true,
      'bg-custom-gray-5 hover:bg-gray-800': type === 'dark',
      'bg-white hover:bg-custom-gray-2': type === 'light',
    },
    className
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClassNames}
      disabled={isDisabled}
      style={style}
    >
      {children}
    </button>
  );
};

export default Button;
