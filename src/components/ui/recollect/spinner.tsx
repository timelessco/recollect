import { Icon, type IconProps } from "./icon";
import { cn } from "@/utils/tailwind-merge";

export const Spinner = (props: IconProps) => {
	const { className, ...rest } = props;

	return (
		<Icon
			className={cn("animate-spin", className)}
			fill="none"
			viewBox="0 0 18 19"
			aria-label="Loading"
			role="status"
			data-slot="spinner"
			{...rest}
		>
			<path
				d="M9 1.428v3.474m0 9.553v3.473M.75 9.68h3.474m9.552 0h3.474M3.167 3.845 5.623 6.3m6.754 6.755 2.457 2.456m-11.667 0 2.456-2.456m6.755-6.754 2.456-2.457"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth=".963"
			/>
		</Icon>
	);
};
