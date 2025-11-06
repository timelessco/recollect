type LightboxCloseIconProps = {
	className?: string;
};

export const LightboxCloseIcon = ({
	className = "",
}: LightboxCloseIconProps) => (
	<svg
		className={className}
		fill="none"
		viewBox="0 0 20 20"
		xmlns="http://www.w3.org/2000/svg"
	>
		<g>
			<path
				d="M16.25 3.75L3.75 16.25M3.75 3.75L16.25 16.25"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</g>
	</svg>
);
