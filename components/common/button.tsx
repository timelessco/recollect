import React from "react";

type ChildrenTypes = JSX.Element | JSX.Element[] | string | string[];

interface ButtonProps {
  children: ChildrenTypes;
  onClick: () => void;
}

const Button: React.FC<ButtonProps> = (props) => {
  const { children, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
    >
      {children}
    </button>
  );
};

export default Button;
