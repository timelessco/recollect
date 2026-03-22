import find from "lodash/find";

import { Popover } from "@/components/ui/recollect/popover";

import useGetViewValue from "../../hooks/useGetViewValue";
import { dropdownMenuItemClassName } from "../../utils/commonClassNames";
import { singleInfoValues, viewValues } from "../../utils/constants";
import { bookmarksViewOptions, RadioGroup } from "../radioGroup";
import { BookmarkCardContentSwitch } from "./bookmark-card-content-switch";
import { BookmarksViewSlider } from "./bookmarks-view-slider";

interface BookmarksViewDropdownProps {
  // based on this it is either rendered in dropdown or in the sliding menu component if its in responsive mobile page
  isDropdown?: boolean;
  renderOnlyButton?: boolean;
}

const renderDropdownHeader = (text: string) => (
  <div className="px-2 py-[6px] text-xs leading-[14px] font-450 text-gray-600">{text}</div>
);

// This renders the view options
export const BookmarksViewDropdown = (props: BookmarksViewDropdownProps) => {
  const { isDropdown = true, renderOnlyButton = false } = props;

  const bookmarksViewValue = useGetViewValue("bookmarksView", "");

  const dropdownContent = (
    <>
      {renderDropdownHeader("View as")}
      <RadioGroup />
      {renderDropdownHeader("Show in Cards")}
      {cardContentOptions.map((option) => (
        <BookmarkCardContentSwitch key={option.value} option={option} />
      ))}
      {(bookmarksViewValue === viewValues.card || bookmarksViewValue === viewValues.moodboard) && (
        <div className="flex items-center justify-between px-2 py-[5px]">
          <p className="text-13 leading-[14.95px] font-450 text-gray-800">Columns</p>
          <div className="mt-px w-[90px]">
            <BookmarksViewSlider />
          </div>
        </div>
      )}
    </>
  );

  const dropdownButtonContent = (
    <>
      <figure className="h-4 w-4">
        {find(bookmarksViewOptions, (item) => item?.value === bookmarksViewValue)?.icon}
      </figure>
      <span className="ml-[7px]">
        {find(bookmarksViewOptions, (item) => item?.value === bookmarksViewValue)?.label}
      </span>
    </>
  );

  if (renderOnlyButton) {
    return <div className={`flex ${dropdownMenuItemClassName}`}>{dropdownButtonContent}</div>;
  }

  return isDropdown ? (
    <BookmarksViewPopover trigger={dropdownButtonContent}>{dropdownContent}</BookmarksViewPopover>
  ) : (
    <div>{dropdownContent}</div>
  );
};

interface BookmarksViewPopoverProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
}

const BookmarksViewPopover = ({ children, trigger }: BookmarksViewPopoverProps) => (
  <Popover.Root>
    <Popover.Trigger
      className="flex items-center rounded-lg bg-transparent px-2 py-[5px] text-13 leading-[14px] font-medium outline-hidden hover:bg-gray-100 data-popup-open:bg-gray-100"
      title="views"
    >
      {trigger}
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Positioner sideOffset={8}>
        <Popover.Popup className="w-[195px] bg-white px-[6px] pt-[6px] pb-3 shadow-custom-1 ring-1 ring-black/5">
          {children}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>
);

interface CardContentOptionsTypes {
  label: string;
  value: string;
}
const cardContentOptions: CardContentOptionsTypes[] = [
  {
    label: "Cover",
    value: singleInfoValues.cover,
  },
  {
    label: "Title",
    value: singleInfoValues.title,
  },
  {
    label: "Description",
    value: singleInfoValues.description,
  },
  {
    label: "Tags",
    value: singleInfoValues.tags,
  },
  {
    label: "Info",
    value: singleInfoValues.info,
  },
];
