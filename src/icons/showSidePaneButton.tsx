type ShowSidePaneButtonProps = {
	className?: string;
};

export const ShowSidePaneButton = ({
	className = "",
}: ShowSidePaneButtonProps) => (
	<svg
		className={className}
		fill="none"
		viewBox="0 0 20 20"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M10 13.333V10m0-3.333h.008M18.333 10a8.333 8.333 0 1 1-16.667 0 8.333 8.333 0 0 1 16.667 0Z"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.25"
		/>
	</svg>
);
