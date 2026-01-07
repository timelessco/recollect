import { Icon, type IconProps } from "@/components/ui/recollect/icon";

export const DiscoverIcon = (props: IconProps) => (
	<Icon
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
		<path
			d="M14.5 9.5L13 13L9.5 14.5L11 11L14.5 9.5Z"
			stroke="currentColor"
			strokeWidth="2"
			fill="none"
			strokeLinejoin="round"
		/>
	</Icon>
);
