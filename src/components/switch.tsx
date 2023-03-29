import { Switch as SwitchComponent } from "@headlessui/react";
import classNames from "classnames";

type SwitchProps = {
	disabled: boolean;
	enabled: boolean;
	setEnabled: () => void;
	size: "large" | "small";
};

const Switch = (props: SwitchProps) => {
	const {
		enabled = false,
		setEnabled,
		disabled = false,
		size = "large",
	} = props;

	const switchClass = classNames(
		"relative inline-flex h-[28px] w-[64px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out  focus:outline-none focus-visible:ring-white disabled:opacity-40",
		{
			"bg-custom-gray-5": enabled === true,
			"bg-custom-gray-13": enabled === false,
			"h-[28px] w-[64px]": size === "large",
			"h-[16px] w-[26px]": size === "small",
		},
	);

	const switcherClass = classNames(
		"pointer-events-none inline-block  rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out disabled:opacity-40",
		{
			"translate-x-9": enabled === true && size === "large",
			"translate-x-0": enabled === false,
			"translate-x-2.5": enabled === true && size === "small",
			"h-[24px] w-[24px]": size === "large",
			"h-[12px] w-[12px]": size === "small",
		},
	);

	return (
		<SwitchComponent
			checked={enabled}
			className={switchClass}
			disabled={disabled}
			onChange={setEnabled}
			// className={`${enabled ? "bg-gray-900" : "bg-gray-100"}
			//      relative inline-flex h-[28px] w-[64px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out  focus:outline-none focus-visible:ring-white disabled:opacity-40`}
		>
			<span className="sr-only">Use setting</span>
			<span
				aria-hidden="true"
				className={switcherClass}
				// className={`${enabled ? "translate-x-9" : "translate-x-0"}
				//     pointer-events-none inline-block h-[24px] w-[24px] rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out disabled:opacity-40`}
			/>
		</SwitchComponent>
	);
};

export default Switch;
