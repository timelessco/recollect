import { useTheme } from "next-themes";

import DownArrowGray from "@/icons/downArrowGray";
import { ThemeSwitchIcon } from "@/icons/theme-switch-icon";

import { Select } from "./ui/recollect/select";

const THEME_OPTIONS = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

export const ToggleDarkMode = () => (
  <div className="pt-10">
    <p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">Appearance</p>
    <div className="flex items-center justify-between rounded-xl bg-gray-100">
      <div className="ml-2 flex items-center gap-2">
        <figure className="flex h-[38px] w-[38px] items-center justify-center">
          <ThemeSwitchIcon className="h-5.5 w-5.5" />
        </figure>
        <div className="my-[19px] text-[14px] leading-[115%] font-medium tracking-normal text-gray-900">
          Choose light/dark mode
        </div>
      </div>
      <div className="mr-[10px] flex items-center">
        <ThemeSelect />
      </div>
    </div>
  </div>
);

const ThemeSelect = () => {
  const { resolvedTheme, setTheme, theme } = useTheme();

  if (!resolvedTheme) {
    return null;
  }

  return (
    <Select.Root
      onValueChange={(value) => {
        if (value) {
          setTheme(value);
        }
      }}
      value={theme}
    >
      <Select.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-50 py-[7.5px] pr-[10px] pl-3 text-sm leading-[115%] font-medium text-gray-800 capitalize filter-[drop-shadow(0_0_0.5px_rgba(0,0,0,0.6))_drop-shadow(0_1px_1px_rgba(0,0,0,0.1))] hover:bg-gray-200">
        <Select.Value />
        <Select.Icon>
          <DownArrowGray className="text-gray-500" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-103" sideOffset={4}>
          <Select.Popup>
            <Select.List>
              {THEME_OPTIONS.map((option) => (
                <Select.Item
                  className="text-sm font-medium"
                  key={option.value}
                  value={option.value}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
};
