import React from "react";

import { Switch } from "@/components/ui/recollect/switch";

import Button from "../../components/atoms/button";
import {
  settingsLightButtonClassName,
  settingsParagraphClassName,
} from "../../utils/commonClassNames";

interface SettingsCardProps {
  buttonLabel?: string;
  description: string;
  enabled?: boolean;
  icon: React.ReactNode;
  isSwitch?: boolean;
  onClick?: () => void;
  onToggle?: () => void;
  title: string;
}

export const SettingsToggleCard: React.FC<SettingsCardProps> = ({
  buttonLabel,
  description,
  enabled = false,
  icon,
  isSwitch,
  onClick,
  onToggle,
  title,
}) => (
  <div className="flex items-center justify-between rounded-xl bg-gray-100">
    <div className="ml-2 flex items-center gap-2">
      <figure className="flex size-[38px] items-center justify-center">{icon}</figure>
      <div className={`my-2 text-gray-900 ${settingsParagraphClassName}`}>
        {title}
        <p className="mt-1 text-[14px] leading-[115%] font-normal text-gray-600">{description}</p>
      </div>
    </div>
    {isSwitch && (
      <div className="mr-[10px] flex items-center">
        <Switch
          checked={enabled}
          disabled={!onToggle}
          onCheckedChange={
            onToggle ??
            (() => {
              // intentional no-op: fallback when onToggle is not provided
            })
          }
          size="medium"
        />
      </div>
    )}
    {!isSwitch && buttonLabel && onClick && (
      <Button
        className={`mr-[10px] ${settingsLightButtonClassName}`}
        onClick={onClick}
        type="light"
      >
        {buttonLabel}
      </Button>
    )}
  </div>
);
