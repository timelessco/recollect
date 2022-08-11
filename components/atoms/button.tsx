import classNames from 'classnames';
import React from 'react';
import { ChildrenTypes } from '../../types/componentTypes';

interface ButtonProps {
  children: ChildrenTypes;
  onClick: () => void;
  className?: string;
  isDisabled?: boolean;
}

const Button: React.FC<ButtonProps> = (props) => {
  const { children, onClick, className, isDisabled = false } = props;

  const buttonClassNames = classNames(className, {
    'text-white bg-gray-700 hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800':
      true,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClassNames}
      disabled={isDisabled}
    >
      {children}
    </button>
  );
};

export default Button;
