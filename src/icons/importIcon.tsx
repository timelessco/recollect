import { Icon, type IconProps } from "@/components/ui/recollect/icon";

export const ImportIcon = (props: IconProps) => (
	<Icon fill="none" viewBox="0 0 18 18" {...props}>
		<path
			d="M8.922 16.5a7.5 7.5 0 1 0 .156-14.999A7.5 7.5 0 0 0 8.922 16.5Z"
			fill="currentColor"
			opacity=".12"
		/>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="m6 9 3 3m0 0 3-3m-3 3V6m7.5 3a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
		/>
	</Icon>
);
