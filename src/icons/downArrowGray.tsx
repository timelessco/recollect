import { Icon } from "../components/atoms/icon";

const DownArrowGray = ({ size = 12, fill = "#707070", className = "" }) => (
	<Icon
		className={className}
		fill="none"
		height={size}
		viewBox="0 0 12 12"
		width={size}
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			clipRule="evenodd"
			d="M1.80543 4.02581C1.54354 4.27133 1.53027 4.68268 1.77579 4.94457L5.52579 8.94457C5.64867 9.07564 5.82033 9.15001 5.99999 9.15001C6.17966 9.15001 6.35131 9.07564 6.47419 8.94457L10.2242 4.94457C10.4697 4.68268 10.4564 4.27133 10.1946 4.02581C9.93266 3.78028 9.52132 3.79355 9.27579 4.05545L5.99999 7.54963L2.72419 4.05545C2.47867 3.79355 2.06732 3.78028 1.80543 4.02581Z"
			fill={fill}
			fillRule="evenodd"
		/>
	</Icon>
);

export default DownArrowGray;
