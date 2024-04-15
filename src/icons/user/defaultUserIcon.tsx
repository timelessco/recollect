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
			<svg
				fill="none"
				height="100%"
				viewBox="0 0 40 40"
				width="100%"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g clipPath="url(#clip0_8631_7308)">
					<circle cx="20" cy="20" fill="#171717" r="20" />
					<path
						clipRule="evenodd"
						d="M13 38.7408V13.4074H20.8773V39.9811C20.5865 39.9937 20.294 40 20 40C17.5374 40 15.1787 39.5549 13 38.7408ZM26.3779 13C23.322 13 20.9453 15.3768 20.9453 18.5006C20.9453 21.5564 23.322 23.9332 26.3779 23.9332C29.5017 23.9332 31.8785 21.5564 31.8785 18.5006C31.8785 15.3768 29.5017 13 26.3779 13Z"
						fill="white"
						fillRule="evenodd"
					/>
				</g>
				<defs>
					<clipPath id="clip0_8631_7308">
						<rect fill="white" height="40" width="40" />
					</clipPath>
				</defs>
			</svg>
		</div>
	);
};

export default DefaultUserIcon;
