import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Bars4Icon } from "@heroicons/react/20/solid";

import type { BookmarksViewTypes } from "../types/componentStoreTypes";

import { useBookmarksViewUpdate } from "../hooks/useBookmarksViewUpdate";
import useGetViewValue from "../hooks/useGetViewValue";
import { TickIcon } from "../icons/tickIcon";
import CardIcon from "../icons/viewIcons/cardIcon";
import ListIcon from "../icons/viewIcons/listIcon";
import MoodboardIconGray from "../icons/viewIcons/moodboardIconGray";
import { viewValues } from "../utils/constants";

const VALID_VIEW_TYPES = new Set<string>(["card", "list", "moodboard", "timeline"]);

function isBookmarksViewType(value: string): value is BookmarksViewTypes {
  return VALID_VIEW_TYPES.has(value);
}

export const bookmarksViewOptions = [
  {
    icon: <MoodboardIconGray />,
    label: "Moodboard",
    value: viewValues.moodboard,
  },
  {
    icon: <ListIcon />,
    label: "List",
    value: viewValues.list,
  },
  {
    icon: <CardIcon />,
    label: "Card",
    value: viewValues.card,
  },
  {
    icon: <Bars4Icon className="h-4 w-4" />,
    label: "Timeline",
    value: viewValues.timeline,
  },
];

export const RadioGroup = () => {
  const { setBookmarksView } = useBookmarksViewUpdate();
  const bookmarksViewValueRaw = useGetViewValue("bookmarksView", "");
  const bookmarksViewValue = typeof bookmarksViewValueRaw === "string" ? bookmarksViewValueRaw : "";

  return (
    <BaseRadioGroup
      className="dropdown-container flex flex-col"
      onValueChange={(newValue) => {
        if (isBookmarksViewType(newValue)) {
          setBookmarksView(newValue, "view");
        }
      }}
      value={bookmarksViewValue}
    >
      {bookmarksViewOptions.map((item) => {
        const isRadioSelected = bookmarksViewValue === item.value;
        return (
          <label
            className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-[5.5px] text-sm leading-4 text-gray-800 hover:bg-gray-alpha-100 hover:text-gray-900 focus:text-gray-900"
            key={item.value}
          >
            <div className="flex items-center text-13 leading-[115%] font-450 tracking-[0.01em]">
              <figure className="mr-2 flex h-4 w-4 items-center justify-center text-plain-reverse">
                {item.icon}
              </figure>
              <Radio.Root className="hidden" value={item.value} />
              {item.label}
            </div>
            {isRadioSelected && <TickIcon className="text-gray-800" />}
          </label>
        );
      })}
    </BaseRadioGroup>
  );
};

RadioGroup.displayName = "RadioGroup";
