import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/utils/tailwind-merge";

type SwitchSize = "medium" | "small";

type SwitchProps = SwitchPrimitive.Root.Props & {
	size: SwitchSize;
};

const rootSizeClasses: Record<SwitchSize, string> = {
	medium: "h-[20px] w-[32px]",
	small: "h-[16px] w-[26px]",
};

const thumbSizeClasses: Record<SwitchSize, string> = {
	medium: "h-[16px] w-[16px] data-[checked]:translate-x-3",
	small: "h-[12px] w-[12px] data-[checked]:translate-x-2.5",
};

export function Switch({ size, className, ...props }: SwitchProps) {
	return (
		<SwitchPrimitive.Root
			className={cn(
				"relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-white data-disabled:opacity-40",
				"data-checked:bg-gray-950 data-unchecked:bg-gray-300",
				rootSizeClasses[size],
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				className={cn(
					"pointer-events-none inline-block translate-x-0 rounded-full bg-gray-0 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] ring-0 transition duration-200 ease-in-out",
					thumbSizeClasses[size],
				)}
			/>
		</SwitchPrimitive.Root>
	);
}
