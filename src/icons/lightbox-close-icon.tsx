import { Icon, type IconProps } from "@/components/ui/recollect/icon";

export const LightboxCloseIcon = (props: IconProps) => (
	<Icon fill="none" viewBox="0 0 20 20" {...props}>
		<path
			d="M16.25 3.75L3.75 16.25M3.75 3.75L16.25 16.25"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</Icon>
);
