import { Switch as SwitchComponent } from "@headlessui/react";
import classNames from "classnames";

type SwitchProps = {
	disabled: boolean;
	enabled: boolean;
	setEnabled: () => void;
	size: "large" | "medium" | "small";
};

const Switch = (props: SwitchProps) => {
	const {
		enabled = false,
		setEnabled,
		disabled = false,
		size = "large",
	} = props;

	const switchClass = classNames(
		"relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-white disabled:opacity-40",
		{
			"bg-gray-950": enabled === true,
			"bg-gray-300": enabled === false,
			"h-[28px] w-[64px]": size === "large",
			"h-[20px] w-[32px]": size === "medium",
			"h-[16px] w-[26px]": size === "small",
		},
	);

	const switcherClass = classNames(
		"pointer-events-none inline-block rounded-full bg-gray-0 ring-0 transition duration-200 ease-in-out disabled:opacity-40",
		{
			"translate-x-9": enabled === true && size === "large",
			"translate-x-3": enabled === true && size === "medium",
			"translate-x-2.5": enabled === true && size === "small",
			"translate-x-0": enabled === false,
			"h-[24px] w-[24px]": size === "large",
			"h-[16px] w-[16px]": size === "medium",
			"h-[12px] w-[12px]": size === "small",
		},
	);

	const switcherStyle = {
		boxShadow:
			"0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
	};

	return (
		<SwitchComponent
			checked={enabled}
			className={switchClass}
			disabled={disabled}
			onChange={setEnabled}
			// className={`${enabled ? "bg-gray-900" : "bg-gray-100"}
			//      relative inline-flex h-[28px] w-[64px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out  focus:outline-hidden focus-visible:ring-white disabled:opacity-40`}
		>
			<span className="sr-only">Use setting</span>
			<span
				aria-hidden="true"
				className={switcherClass}
				style={switcherStyle}
				// className={`${enabled ? "translate-x-9" : "translate-x-0"}
				//     pointer-events-none inline-block h-[24px] w-[24px] rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out disabled:opacity-40`}
			/>
		</SwitchComponent>
	);
};

export default Switch;
