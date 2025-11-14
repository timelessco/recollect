import { Icon, type IconProps } from "@/components/ui/recollect/icon";

const GoogleIcon = (props: IconProps) => (
	<Icon fill="none" viewBox="0 0 16 16" {...props}>
		<path
			fill="#d94f3d"
			d="M8 3.67c1.02 0 2 .36 2.78 1.01l2.18-2.07A7.33 7.33 0 0 0 1.43 4.75L3.9 6.64A4.3 4.3 0 0 1 8 3.67"
		/>
		<path
			fill="#f2c042"
			d="M3.67 8q0-.7.22-1.36l-2.46-1.9a7.3 7.3 0 0 0 0 6.51L3.9 9.36Q3.67 8.7 3.67 8"
		/>
		<path
			fill="#5085ed"
			d="M15.03 6.67h-7v3H12a3.6 3.6 0 0 1-1.52 2.05l2.44 1.88c1.56-1.4 2.47-3.67 2.11-6.93"
		/>
		<path
			fill="#57a75c"
			d="M10.48 11.72c-.75.43-1.61.64-2.48.61a4.3 4.3 0 0 1-4.11-2.97l-2.46 1.9A7.3 7.3 0 0 0 8 15.32a7.3 7.3 0 0 0 4.92-1.73z"
		/>
	</Icon>
);

export default GoogleIcon;
