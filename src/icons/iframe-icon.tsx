import { Icon, type IconProps } from "@/components/atoms/icon";

export const IframeIcon = (props: IconProps) => (
	<Icon
		{...props}
		fill="none"
		stroke="currentColor"
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeWidth="1"
	>
		<rect width="18" height="7" x="3" y="3" rx="1" />
		<rect width="9" height="7" x="3" y="14" rx="1" />
		<rect width="5" height="7" x="16" y="14" rx="1" />
	</Icon>
);
