import React from "react";

import Button from "../../components/atoms/button";
import Switch from "../../components/switch";
import {
	settingsLightButtonClassName,
	settingsParagraphClassName,
} from "../../utils/commonClassNames";

type SettingsCardProps = {
	icon: React.ReactNode;
	title: string;
	description: string;
	buttonLabel?: string;
	onClick?: () => void;
	isSwitch?: boolean;
	enabled?: boolean;
	onToggle?: () => void;
};

export const SettingsToggleCard: React.FC<SettingsCardProps> = ({
	icon,
	title,
	description,
	buttonLabel,
	onClick,
	isSwitch,
	enabled = false,
	onToggle,
}) => (
	<div className="flex items-center justify-between rounded-xl bg-gray-100">
		<div className="ml-[19.5px] flex items-center gap-2">
			{icon}
			<div className={`my-2 ml-2 text-gray-900 ${settingsParagraphClassName}`}>
				{title}
				<p className="mt-1 text-[14px] leading-[115%] font-normal text-gray-600">
					{description}
				</p>
			</div>
		</div>
		{isSwitch ? (
			<div className="mr-[10px]">
				<Switch
					enabled={enabled}
					disabled={!onToggle}
					size="medium"
					setEnabled={onToggle || (() => {})}
				/>
			</div>
		) : buttonLabel && onClick ? (
			<Button
				className={`mr-[10px] ${settingsLightButtonClassName}`}
				onClick={onClick}
				type="light"
			>
				{buttonLabel}
			</Button>
		) : null}
	</div>
);
