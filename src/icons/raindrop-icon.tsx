import { Icon, type IconProps } from "@/components/atoms/icon";

export const RaindropIcon = (props: IconProps) => (
	<Icon fill="none" viewBox="0 0 32 26" {...props}>
		<path
			fill="#1988E0"
			fillRule="evenodd"
			d="M23.535 3.505a10.667 10.667 0 0 1-.4 15.468l-7.134 6.733-7.134-6.667-.4-.466A10.667 10.667 0 1 1 23.535 3.505Z"
			clipRule="evenodd"
		/>
		<path
			fill="#2CD4ED"
			d="M8 9.705a8 8 0 0 1 8.001 8v8.001h-8a8 8 0 1 1 0-16Z"
		/>
		<mask
			id="a"
			width="17"
			height="17"
			x="0"
			y="9"
			maskUnits="userSpaceOnUse"
			style={{ maskType: "luminance" }}
		>
			<path
				fill="#fff"
				d="M8 9.705a8 8 0 0 1 8.001 8v8.001h-8a8 8 0 1 1 0-16Z"
			/>
		</mask>
		<g mask="url(#a)">
			<path
				fill="#0DB4E2"
				fillRule="evenodd"
				d="M23.535 3.505a10.667 10.667 0 0 1-.4 15.468l-7.134 6.733-7.134-6.667-.4-.466A10.667 10.667 0 1 1 23.535 3.505Z"
				clipRule="evenodd"
			/>
		</g>
		<path fill="#3169FF" d="M16.001 25.706v-8.2a8 8 0 1 1 8 8.2h-8Z" />
		<mask
			id="b"
			width="16"
			height="17"
			x="16"
			y="9"
			maskUnits="userSpaceOnUse"
			style={{ maskType: "luminance" }}
		>
			<path fill="#fff" d="M16.001 25.706v-8.2a8 8 0 1 1 8 8.2h-8Z" />
		</mask>
		<g mask="url(#b)">
			<path
				fill="#3153FF"
				fillRule="evenodd"
				d="M23.535 3.505a10.667 10.667 0 0 1-.4 15.468l-7.134 6.733-7.134-6.667-.4-.466A10.667 10.667 0 1 1 23.535 3.505Z"
				clipRule="evenodd"
			/>
		</g>
	</Icon>
);
