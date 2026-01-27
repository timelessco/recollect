import { Icon, type IconProps } from "@/components/ui/recollect/icon";

export const InfoIcon = (props: IconProps) => (
	<Icon fill="none" viewBox="0 0 18 18" {...props} name="info">
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M9 6v3m0 3h.008M16.5 9a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
		/>
	</Icon>
);
