import classNames from "classnames";

const DefaultUserIcon = ({ className = "h-6 w-6 " }) => {
	const iconClassName = classNames(
		{
			"flex items-center justify-center rounded-full bg-slate-200": true,
		},
		className,
	);
	return (
		<div className={iconClassName}>
			<svg fill="#000000" height="14" viewBox="0 0 18 18" width="14">
				<use href="/sprite.svg#user" />
			</svg>
		</div>
	);
};

export default DefaultUserIcon;
