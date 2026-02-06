import { Icon, type IconProps } from "@/components/ui/recollect/icon";

export const HashIcon = (props: IconProps) => {
	return (
		<Icon fill="none" viewBox="0 0 14 14" {...props}>
			<path
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth=".875"
				d="m5.542 1.75-1.75 10.5m6.417-10.5-1.75 10.5M11.958 4.666H2.041m9.334 4.667H1.458"
			/>
		</Icon>
	);
};
