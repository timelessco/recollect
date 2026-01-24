import { Icon, type IconProps } from "@/components/atoms/icon";

export const XIcon = (props: IconProps) => (
	<Icon {...props} fill="none" viewBox="0 0 18 18">
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="m10.13 7.745 4.037-5.218M3.225 15.587l4.642-5.578"
		/>
		<path
			fill="currentColor"
			d="M1.625 2.438h5.07l10 13.124h-5.07l-10-13.124Z"
			opacity=".12"
		/>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="m6.449 2.938 9.238 12.124h-3.815L2.633 2.938H6.45Z"
		/>
	</Icon>
);

export default XIcon;
