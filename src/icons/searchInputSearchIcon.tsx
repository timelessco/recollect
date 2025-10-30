type SearchInputSearchIconProps = {
	color?: string;
	size?: string;
};

const SearchInputSearchIcon = ({
	color,
	size = "12",
}: SearchInputSearchIconProps) => (
	<svg
		fill={color ?? "currentColor"}
		height={size}
		style={color ? { color } : undefined}
		viewBox="0 0 12 12"
		width={size}
		xmlns="http://www.w3.org/2000/svg"
	>
		<g clipPath="url(#clip0_6475_12653)">
			<path
				clipRule="evenodd"
				d="M1.65 4.99998C1.65 3.14982 3.14985 1.64998 5 1.64998C6.85015 1.64998 8.35 3.14982 8.35 4.99998C8.35 6.85013 6.85015 8.34998 5 8.34998C3.14985 8.34998 1.65 6.85013 1.65 4.99998ZM5 0.349976C2.43188 0.349976 0.35 2.43185 0.35 4.99998C0.35 7.5681 2.43188 9.64997 5 9.64997C6.04966 9.64997 7.01809 9.30218 7.79634 8.71555L10.5405 11.4597C10.7943 11.7136 11.2059 11.7136 11.4597 11.4597C11.7136 11.2059 11.7136 10.7943 11.4597 10.5405L8.71557 7.79631C9.30221 7.01806 9.65 6.04964 9.65 4.99998C9.65 2.43185 7.56812 0.349976 5 0.349976Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</g>
		<defs>
			<clipPath id="clip0_6475_12653">
				<rect fill="white" height="12" width="12" />
			</clipPath>
		</defs>
	</svg>
);

export default SearchInputSearchIcon;
