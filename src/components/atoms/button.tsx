import { type FC } from "react";
import classNames from "classnames";

import { type ChildrenTypes } from "../../types/componentTypes";
import { smoothHoverClassName } from "../../utils/commonClassNames";
import { tcx } from "../../utils/tailwind-merge";

type ButtonProps = {
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
};

const Button: FC<ButtonProps> = (props) => {
	const {
		children,
		onClick,
		className,
		disabledClassName,
		isDisabled = false,
		type = "light",
		id = "",
		style,
		isActive = false,
		tabIndex = -1,
		title = "",
	} = props;

	const buttonClassNames = tcx(
		classNames({
			[smoothHoverClassName]: true,
			"flex items-center rounded-lg px-2 py-[5px] text-13 leading-[14px] font-medium": true,
			"bg-gray-950 text-white hover:bg-gray-800": type === "dark",
			"bg-transparent hover:bg-gray-100": type === "light",
			"bg-gray-100": isActive,
		}),
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
			type="button"
		>
			{children}
		</button>
	);
};

export default Button;
