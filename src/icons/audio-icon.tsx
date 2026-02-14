import { Icon, type IconProps } from "@/components/atoms/icon";

export const AudioIcon = ({ ...props }: IconProps) => (
	<Icon
		fill="none"
		viewBox="0 0 18 18"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			d="M3 8.167v2.5M6 5.667v7.5M9 2.667v13.5M12 3.667v11.5M15 6.667v5.5"
			stroke="currentColor"
			strokeLinecap="round"
		/>
	</Icon>
);
