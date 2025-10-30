import { type FC } from "react";
import classNames from "classnames";

import { type ChildrenTypes } from "../../types/componentTypes";
import { smoothHoverClassName } from "../../utils/commonClassNames";
import { tcm } from "../../utils/tailwindMerge";

type ButtonProps = {
	children: ChildrenTypes;
	className?: string;
	id?: string;
	isActive?: boolean;
	isDisabled?: boolean;
	onClick?: () => void;
	style?: Record<string, unknown>;
	tabIndex?: number;
	title?: string;
	type?: "dark" | "light";
};

const Button: FC<ButtonProps> = (props) => {
	const {
		children,
		onClick,
		className,
		isDisabled = false,
		type = "light",
		id = "",
		style,
		isActive = false,
		tabIndex = -1,
		title = "",
	} = props;

	const buttonClassNames = tcm(
		classNames({
			[smoothHoverClassName]: true,
			"flex items-center rounded-lg py-[5px] px-2 text-[13px] font-medium leading-[14px]":
				true,
			"bg-gray-950  hover:bg-gray-800 text-white": type === "dark",
			"bg-transparent hover:bg-gray-100": type === "light",
			"bg-gray-100": isActive,
			"disabled:opacity-5": isDisabled,
		}),
		className,
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
			type="button"
		>
			{children}
		</button>
	);
};

export default Button;
