import { Icon, type IconProps } from "@/components/atoms/icon";

export const AddBookmarkInputIcon = (props: IconProps) => (
	<Icon {...props} fill="none" viewBox="0 0 16 16">
		<g
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			clipPath="url(#a)"
		>
			<rect
				width="9.589"
				height="11.015"
				x="6.585"
				y="3"
				fill="#F5F5F5"
				rx="3"
				transform="rotate(7.33 6.585 3)"
			/>
			<rect
				width="10.372"
				height="12.133"
				y="3.488"
				fill="#F5F5F5"
				rx="3"
				transform="rotate(-13.882 0 3.488)"
			/>
			<path d="m5.876 5.75 1.228 4.5M8.74 7.387l-4.5 1.227" />
		</g>
		<defs>
			<clipPath id="a">
				<path fill="#fff" d="M0 0h16v16H0z" />
			</clipPath>
		</defs>
	</Icon>
);
