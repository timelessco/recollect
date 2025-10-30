type TickIconProps = {
	color?: string;
};

const TickIcon = ({ color = "#383838" }: TickIconProps) => (
	<svg
		fill="none"
		height="12"
		viewBox="0 0 12 12"
		width="12"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			clipRule="evenodd"
			d="M10.5739 2.19354C10.8456 2.42818 10.8756 2.83864 10.641 3.11032L5.01371 9.62614C4.89175 9.76735 4.715 9.84934 4.52842 9.85125C4.34185 9.85316 4.16345 9.7748 4.03863 9.63611L1.37307 6.67438C1.13292 6.40755 1.15455 5.99656 1.42139 5.75641C1.68822 5.51626 2.09921 5.53789 2.33935 5.80472L4.51172 8.21846L9.65713 2.26062C9.89177 1.98893 10.3022 1.9589 10.5739 2.19354Z"
			fill={color}
			fillRule="evenodd"
		/>
	</svg>
);

export default TickIcon;
