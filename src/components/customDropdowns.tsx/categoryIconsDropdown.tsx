import { useEffect, useMemo, useState } from "react";

import { matchSorter } from "match-sorter";

import type { CategoriesData } from "@/types/apiTypes";

import { Popover } from "@/components/ui/recollect/popover";

import { useUpdateCategoryOptimisticMutation } from "../../async/mutationHooks/category/use-update-category-optimistic-mutation";
import SearchIconSmallGray from "../../icons/searchIconSmallGray";
import { iconOptions } from "../../utils/commonData";
import Button from "../atoms/button";
import { CollectionIcon } from "../collectionIcon";
import { ColorPicker } from "../colorPicker";

const ICONS_PER_PAGE = 99;
const ROW_SIZE = 11;

const allLabels = iconOptions.map((item) => item.label);
const TOTAL_PAGES = Math.ceil(iconOptions.length / ICONS_PER_PAGE);

interface CategoryIconsDropdownProps {
  buttonIconSize?: number;
  iconColor: CategoriesData["icon_color"];
  iconId: number;
  iconValue: null | string;
}

export const CategoryIconsDropdown = (props: CategoryIconsDropdownProps) => {
  const { buttonIconSize = 20, iconColor, iconId, iconValue } = props;

  const { updateCategoryOptimisticMutation } = useUpdateCategoryOptimisticMutation();

  const [color, setColor] = useState(iconColor);
  const [searchValue, setSearchValue] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setColor(iconColor);
  }, [iconColor]);

  const isSearching = searchValue.length > 1;

  const filteredLabels = useMemo(() => {
    if (!isSearching) {
      const start = pageIndex * ICONS_PER_PAGE;
      return allLabels.slice(start, start + ICONS_PER_PAGE);
    }

    return matchSorter(allLabels, searchValue);
  }, [isSearching, pageIndex, searchValue]);

  const handleIconColorChange = (newColor: string) => {
    updateCategoryOptimisticMutation.mutate({
      category_id: iconId,
      updateData: { icon_color: newColor },
    });
  };

  const handleIconSelect = (icon: string) => {
    updateCategoryOptimisticMutation.mutate({
      category_id: iconId,
      updateData: { icon },
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchValue("");
    }
  };

  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Popover.Trigger className="cursor-pointer rounded-full outline-hidden focus-visible:ring-1 focus-visible:ring-gray-200">
        <CollectionIcon
          bookmarkCategoryData={{
            icon: iconValue,
            icon_color: color,
          }}
          iconSize="12"
          size={buttonIconSize.toString()}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="z-103" sideOffset={8}>
          <Popover.Popup className="h-[368px] w-[310px] p-0 px-1 shadow-custom-1 ring-1 ring-black/5">
            <IconPickerHeader searchValue={searchValue} setSearchValue={setSearchValue} />
            <div className="icon-color-container overflow-x-scroll pt-2">
              <ColorPicker
                onChange={(sliderColor) => {
                  setColor(sliderColor);
                  handleIconColorChange(sliderColor);
                }}
                selectedColor={color}
              />
            </div>
            <div className="flex h-[253px] flex-col pt-2 pb-3">
              <IconGrid labels={filteredLabels} onSelect={handleIconSelect} />
              {!isSearching && (
                <IconPagination
                  currentPage={pageIndex + 1}
                  onNext={() => {
                    setPageIndex((prev) => prev + 1);
                  }}
                  onPrev={() => {
                    setPageIndex((prev) => prev - 1);
                  }}
                  totalPages={TOTAL_PAGES}
                />
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};

interface IconPickerHeaderProps {
  searchValue: string;
  setSearchValue: (value: string) => void;
}

function IconPickerHeader({ searchValue, setSearchValue }: IconPickerHeaderProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex w-full items-center rounded-lg bg-gray-alpha-100 px-[10px] py-[7px]">
        <figure className="mr-[6px] h-3 w-3 text-gray-600">
          <SearchIconSmallGray />
        </figure>
        <input
          aria-label="Search icons"
          className="w-full bg-transparent text-sm leading-4 font-normal text-gray-600 outline-hidden focus-visible:ring-1 focus-visible:ring-gray-200"
          onChange={(event) => {
            setSearchValue(event.target.value);
          }}
          placeholder="Search..."
          type="text"
          value={searchValue}
        />
      </div>
    </div>
  );
}

interface IconGridProps {
  labels: string[];
  onSelect: (icon: string) => void;
}

function IconGrid({ labels, onSelect }: IconGridProps) {
  const rows = useMemo(() => {
    const result: string[][] = [];
    for (let index = 0; index < labels.length; index += ROW_SIZE) {
      result.push(labels.slice(index, index + ROW_SIZE));
    }

    return result;
  }, [labels]);

  return (
    <div className="mx-auto w-full max-w-[286px]">
      {rows.map((row) => (
        <div className="flex justify-start" key={row[0]}>
          {row.map((label) => (
            <IconGridItem key={label} label={label} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  );
}

interface IconGridItemProps {
  label: string;
  onSelect: (icon: string) => void;
}

function IconGridItem({ label, onSelect }: IconGridItemProps) {
  const data = iconOptions.find((item) => item.label === label);
  const iconColor = "var(--color-plain-reverse)";

  return (
    <button
      className="custom-select rounded-md p-1 hover:bg-gray-200"
      onClick={() => {
        onSelect(label);
      }}
      title={data?.label}
      type="button"
    >
      <div className="h-[18px] w-[18px]">{data?.icon(iconColor)}</div>
    </button>
  );
}

interface IconPaginationProps {
  currentPage: number;
  onNext: () => void;
  onPrev: () => void;
  totalPages: number;
}

function IconPagination({ currentPage, onNext, onPrev, totalPages }: IconPaginationProps) {
  return (
    <div className="absolute bottom-2 left-0 flex w-full justify-between px-2 pt-2">
      <Button className="text-plain-reverse!" isDisabled={currentPage === 1} onClick={onPrev}>
        prev
      </Button>
      <span className="text-13 font-medium">
        {currentPage}/{totalPages}
      </span>
      <Button
        className="text-plain-reverse!"
        isDisabled={currentPage === totalPages}
        onClick={onNext}
      >
        next
      </Button>
    </div>
  );
}
