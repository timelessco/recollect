import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { useTheme } from "next-themes";

import { AriaDropdown } from "@/components/ariaDropdown";
import DownArrowGray from "@/icons/downArrowGray";
import { ThemeSwitchIcon } from "@/icons/theme-switch-icon";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "@/utils/commonClassNames";

export const ToggleDarkMode = () => {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [isOpen, setIsOpen] = useState(false);

	// Don't render until theme is determined (prevents hydration mismatch)
	if (!resolvedTheme) {
		return null;
	}

	const themeOptions = [
		{ value: "system", label: "System" },
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
	] as const;

	const currentThemeLabel = themeOptions.find(
		(option) => option.value === theme,
	)?.label;

	return (
		<div className="pt-10">
			<p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">
				Appearance
			</p>
			<div className="flex items-center justify-between rounded-xl bg-gray-100">
				<div className="ml-[19.5px] flex items-center gap-2">
					<ThemeSwitchIcon className="h-5 w-5" />
					<div className="my-[19px] ml-2 text-[14px] leading-[115%] font-medium tracking-normal text-gray-900">
						Choose light/dark mode
					</div>
				</div>
				<div className="mr-[10px] flex items-center">
					<AriaDropdown
						isOpen={isOpen}
						menuOpenToggle={setIsOpen}
						menuButton={
							<Button className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-50 py-[7.5px] pr-[10px] pl-3 text-sm leading-[115%] font-medium text-gray-800 filter-[drop-shadow(0_0_1px_rgba(0,0,0,0.2))_drop-shadow(0_1px_1px_rgba(0,0,0,0.1))] outline-none hover:bg-gray-200">
								<span>{currentThemeLabel}</span>
								<DownArrowGray className="text-gray-400" />
							</Button>
						}
					>
						<div className={`${dropdownMenuClassName} mt-0.5`}>
							{themeOptions.map((option) => (
								<Button
									key={option.value}
									className={`${dropdownMenuItemClassName} w-full text-left text-13`}
									onClick={() => {
										setTheme(option.value);
										setIsOpen(false);
									}}
									type="button"
								>
									{option.label}
								</Button>
							))}
						</div>
					</AriaDropdown>
				</div>
			</div>
		</div>
	);
};
