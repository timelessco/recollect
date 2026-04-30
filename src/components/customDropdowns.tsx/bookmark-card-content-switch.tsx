import { Switch } from "@/components/ui/recollect/switch";

import { useBookmarksViewUpdate } from "../../hooks/useBookmarksViewUpdate";
import useGetViewValue from "../../hooks/useGetViewValue";
import { viewValues } from "../../utils/constants";
import { errorToast } from "../../utils/toastMessages";

interface BookmarkCardContentSwitchProps {
  option: { label: string; value: string };
}

function isOptionEnabled(
  option: { label: string; value: string },
  currentView: string,
  selectedValues: string[],
): boolean {
  // Canvas tiles only render the cover image — toggles are display-only.
  if (currentView === viewValues.canvas) {
    return option.label === "Cover";
  }

  if (currentView === viewValues.moodboard || currentView === viewValues.card) {
    return option.label === "Cover" || selectedValues.includes(option.value);
  }

  if (currentView === viewValues.list) {
    return option.label === "Title" || selectedValues.includes(option.value);
  }

  return selectedValues.includes(option.value);
}

function isOptionDisabled(option: { label: string; value: string }, currentView: string): boolean {
  // Canvas locks every toggle — the layout has no room for title /
  // description / tags / info, so all options are read-only.
  if (currentView === viewValues.canvas) {
    return true;
  }

  if (currentView === viewValues.moodboard || currentView === viewValues.card) {
    return option.label === "Cover";
  }

  if (currentView === viewValues.list) {
    return option.label === "Title";
  }

  return false;
}

export function BookmarkCardContentSwitch({ option }: BookmarkCardContentSwitchProps) {
  const { setBookmarksView } = useBookmarksViewUpdate();
  const bookmarksInfoValueRaw = useGetViewValue("cardContentViewArray", []);
  const bookmarksViewValue = useGetViewValue("bookmarksView", "");

  const selectedValues: string[] = Array.isArray(bookmarksInfoValueRaw)
    ? bookmarksInfoValueRaw.filter((v): v is string => typeof v === "string")
    : [];
  const currentView = typeof bookmarksViewValue === "string" ? bookmarksViewValue : "";
  const isEnabled = isOptionEnabled(option, currentView, selectedValues);
  const isDisabled = isOptionDisabled(option, currentView);

  const handleToggle = () => {
    if (selectedValues.includes(option.value)) {
      if (selectedValues.length > 1) {
        setBookmarksView(
          selectedValues.filter((value) => value !== option.value),
          "info",
        );
      } else {
        errorToast("At least one view option needs to be selected");
      }
    } else {
      setBookmarksView([...selectedValues, option.value], "info");
    }
  };

  return (
    <div className="flex items-center justify-between px-2 py-[5.5px]">
      <p className="text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-800">
        {option.label}
      </p>
      <Switch
        checked={isEnabled}
        disabled={isDisabled}
        onCheckedChange={handleToggle}
        size="small"
      />
    </div>
  );
}
