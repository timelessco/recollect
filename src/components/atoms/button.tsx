import { type FC } from "react";
import classNames from "classnames";

import { type ChildrenTypes } from "../../types/componentTypes";
import { tcm } from "../../utils/tailwindMerge";

type ButtonProps = {
	children: ChildrenTypes;
	className?: string;
	id?: string;
	isActive?: boolean;
	isDisabled?: boolean;
	onClick?: () => void;
	style?: Record<string, unknown>;
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
	} = props;

	const buttonClassNames = tcm(
		classNames({
			"flex items-center rounded-lg py-[5px] px-2 text-[13px] font-medium leading-[14px]":
				true,
			"bg-custom-gray-5 hover:bg-gray-800": type === "dark",
			"bg-white hover:bg-custom-gray-8": type === "light",
			"bg-custom-gray-8": isActive,
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
			type="button"
		>
			{children}
		</button>
	);
};

export default Button;
