import { IframeIcon } from "../../icons/iframe-icon";
import { useIframeStore } from "../../store/iframeStore";

import { SettingsToggleCard } from "./settingsToggleCard";

export function SettingsIframeToggle() {
	return (
		<div className="pt-10">
			<p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">
				Iframe
			</p>
			<SettingsIframeToggleSwitch />
		</div>
	);
}

function SettingsIframeToggleSwitch() {
	const iframeEnabled = useIframeStore((state) => state.iframeEnabled);
	const setIframeEnabled = useIframeStore((state) => state.setIframeEnabled);

	return (
		<SettingsToggleCard
			icon={
				<figure className="text-gray-900">
					<IframeIcon className="h-5.5 w-5.5 text-gray-900" />
				</figure>
			}
			title="Enable iframe in lightbox"
			description="Allow embedding external content in lightbox view"
			isSwitch
			enabled={iframeEnabled}
			onToggle={() => setIframeEnabled(!iframeEnabled)}
		/>
	);
}
