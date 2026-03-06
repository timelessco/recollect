import { Icon, type IconProps } from "@/components/atoms/icon";

export const GlobeLinkIcon = (props: IconProps) => (
	<Icon {...props} fill="none" viewBox="0 0 18 18">
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M16.486 9A7.486 7.486 0 1 1 1.515 9a7.486 7.486 0 0 1 14.971 0Z"
		/>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M9 16.283c-1.787 0-3.236-3.261-3.236-7.284 0-4.022 1.449-7.283 3.237-7.283s3.237 3.26 3.237 7.283c0 4.023-1.45 7.284-3.237 7.284Z"
		/>
		<path
			fill="currentColor"
			d="M9 1.515A7.486 7.486 0 1 1 9 16.487 7.486 7.486 0 0 1 9 1.514Zm0 .2C7.213 1.717 5.763 4.978 5.763 9S7.213 16.282 9 16.282c1.788 0 3.238-3.26 3.238-7.283 0-4.023-1.45-7.283-3.238-7.283Z"
			opacity=".12"
		/>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M16.284 8.999a26.4 26.4 0 0 1-14.567 0"
		/>
	</Icon>
);
