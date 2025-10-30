import React from "react";

export const Spinner = ({
	className = "",
	style = {},
}: {
	className?: string;
	style?: React.CSSProperties;
}) => (
	<svg
		className={className}
		fill="none"
		style={{ color: "inherit", ...style }}
		viewBox="0 0 18 19"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M9 1.428v3.474m0 9.553v3.473M.75 9.68h3.474m9.552 0h3.474M3.167 3.845 5.623 6.3m6.754 6.755 2.457 2.456m-11.667 0 2.456-2.456m6.755-6.754 2.456-2.457"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth=".963"
		/>
	</svg>
);
