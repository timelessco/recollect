import { Icon, type IconProps } from "@/components/ui/recollect/icon";

export const DiscoverIcon = (props: IconProps) => (
	<Icon width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
		<path
			fill="currentColor"
			d="M16.29 9A7.29 7.29 0 1 1 1.71 9a7.29 7.29 0 0 1 14.58 0Z"
			opacity=".12"
		/>
		<path
			stroke="currentColor"
			strokeLinejoin="round"
			d="M16.29 9A7.29 7.29 0 1 1 1.71 9a7.29 7.29 0 0 1 14.58 0Z"
		/>
		<path
			fill="#fff"
			stroke="currentColor"
			strokeLinejoin="round"
			d="m10.992 6.548-3.078.84a.75.75 0 0 0-.527.526l-.84 3.078c-.076.28.181.537.461.46l3.079-.84a.75.75 0 0 0 .526-.525l.84-3.079a.375.375 0 0 0-.461-.46Z"
		/>
	</Icon>
);
