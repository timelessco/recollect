import { useBookmarksViewUpdate } from "../../hooks/useBookmarksViewUpdate";
import useGetViewValue from "../../hooks/useGetViewValue";
import { type BookmarkViewCategories } from "../../types/componentStoreTypes";
import { singleInfoValues, viewValues } from "../../utils/constants";
import { errorToast } from "../../utils/toastMessages";

import { Switch } from "@/components/ui/recollect/switch";

type BookmarkCardContentSwitchProps = {
	option: { label: string; value: string };
};

function isOptionEnabled(
	option: { label: string; value: string },
	currentView: string,
	selectedValues: string[],
): boolean {
	if (currentView === viewValues.moodboard || currentView === viewValues.card) {
		return option.label === "Cover" || selectedValues.includes(option.value);
	}

	if (currentView === viewValues.list) {
		return option.label === "Title" || selectedValues.includes(option.value);
	}

	return selectedValues.includes(option.value);
}

function isOptionDisabled(
	option: { label: string; value: string },
	currentView: string,
): boolean {
	if (currentView === viewValues.moodboard || currentView === viewValues.card) {
		return option.label === "Cover";
	}

	if (currentView === viewValues.list) {
		return option.label === "Title";
	}

	return false;
}

export function BookmarkCardContentSwitch({
	option,
}: BookmarkCardContentSwitchProps) {
	const { setBookmarksView } = useBookmarksViewUpdate();
	const bookmarksInfoValueRaw = useGetViewValue("cardContentViewArray", []);
	const bookmarksViewValue = useGetViewValue("bookmarksView", "");

	const selectedValues = Array.isArray(bookmarksInfoValueRaw)
		? (bookmarksInfoValueRaw as string[])
		: [];
	const currentView = bookmarksViewValue as string;
	const isEnabled = isOptionEnabled(option, currentView, selectedValues);
	const isDisabled = isOptionDisabled(option, currentView);

	const handleToggle = () => {
		if (selectedValues.includes(option.value)) {
			if (selectedValues.length > 1) {
				setBookmarksView(
					selectedValues.filter((value) => value !== option.value),
					singleInfoValues.info as BookmarkViewCategories,
				);
			} else {
				errorToast("At least one view option needs to be selected");
			}
		} else {
			setBookmarksView(
				[...selectedValues, option.value],
				singleInfoValues.info as BookmarkViewCategories,
			);
		}
	};

	return (
		<div className="flex items-center justify-between px-2 py-[5.5px]">
			<p className="text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-800">
				{option.label}
			</p>
			<Switch
				disabled={isDisabled}
				checked={isEnabled}
				onCheckedChange={handleToggle}
				size="small"
			/>
		</div>
	);
}
