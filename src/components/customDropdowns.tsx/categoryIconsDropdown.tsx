import { useEffect, useState } from "react";
import Slider from "@uiw/react-color-slider";
import {
	Combobox,
	ComboboxItem,
	ComboboxList,
	ComboboxRow,
	useComboboxState,
} from "ariakit/combobox";
import { Menu, MenuButton, useMenuState } from "ariakit/menu";
import { find } from "lodash";

import SearchIconSmallGray from "../../icons/searchIconSmallGray";
import { type CategoryIconsDropdownTypes } from "../../types/componentTypes";
import { options } from "../../utils/commonData";
import Button from "../atoms/button";

const CategoryIconsDropdown = (props: CategoryIconsDropdownTypes) => {
	const { onIconSelect, iconValue, onIconColorChange, iconColor } = props;
	// const [hsva, setHsva] = useState({ h: 0, s: 0, v: 289, a: 1 });
	const [color, setColor] = useState(iconColor);
	const [pageIndex, setPageIndex] = useState(0);

	const iconsList = options(color);

	const [myList, setMyList] = useState(
		iconsList
			?.map((item) => item?.label)
			?.filter((_filterItem, index) => index < 100),
	);

	useEffect(() => {
		setColor(iconColor);
	}, [iconColor]);

	const combobox = useComboboxState({
		list: myList,

		setList: setMyList,
	});
	const menu = useMenuState(combobox);

	// constants
	const totalIconsPerPage = 100;
	const totalPagesValue = Math.ceil(iconsList?.length / totalIconsPerPage);
	const currentPage = pageIndex + 1;

	const onPaginationClick = (paginationType: "next" | "prev") => {
		if (paginationType === "next") {
			const paginationLimitLogic = !pageIndex
				? totalIconsPerPage
				: pageIndex * totalIconsPerPage + totalIconsPerPage;

			const defaultList = iconsList
				?.map((item) => item?.label)
				?.filter((_filterItem, index) => {
					if (
						index > paginationLimitLogic &&
						index < paginationLimitLogic + totalIconsPerPage
					) {
						return true;
					} else {
						return false;
					}
				});

			setMyList(defaultList);
			setPageIndex(pageIndex + 1);
		} else {
			const paginationLimitLogic = !pageIndex
				? totalIconsPerPage
				: pageIndex * totalIconsPerPage;

			const defaultList = iconsList
				?.map((item) => item?.label)
				?.filter((_filterItem, index) => {
					if (
						index > paginationLimitLogic - totalIconsPerPage &&
						index < paginationLimitLogic
					) {
						return true;
					} else {
						return false;
					}
				});

			setMyList(defaultList);
			setPageIndex(pageIndex - 1);
		}
	};

	// Resets combobox value when menu is closed
	if (!menu.mounted && combobox.value) {
		combobox.setValue("");
	}

	const renderItem = (value: string) => {
		const data = find(iconsList, (item) => item?.label === value);

		return (
			<div className="h-[18px] w-[18px]" title={data?.label}>
				{data?.icon()}
			</div>
		);
	};

	const renderComboBoxItem = (value: string, index: number) => (
		<ComboboxItem
			className="data-active-item:bg-custom-gray-7 custom-select rounded-md p-1 hover:bg-custom-gray-7"
			focusOnHover
			key={value + index}
			onClick={() => onIconSelect(value)}
			setValueOnClick={false}
			value={value}
		>
			{renderItem(value)}
		</ComboboxItem>
	);

	return (
		<>
			<MenuButton state={menu}>
				{find(iconsList, (item) => item?.label === iconValue)?.icon()}
			</MenuButton>
			<Menu
				className="absolute left-4 z-10 mt-2 w-[319px] origin-top-left rounded-xl bg-white px-3 shadow-custom-1 ring-1 ring-black/5 focus:outline-none"
				composite={false}
				state={menu}
			>
				<div className="flex items-center justify-between border-b-[1px] border-b-custom-gray-7 py-3">
					<span className="text-sm font-medium leading-4 text-custom-gray-1">
						Choose an icon
					</span>
					<div className="flex w-[139px] items-center rounded-lg bg-custom-gray-6 px-[10px] py-[7px]">
						<figure className="mr-[6px] h-3 w-3">
							<SearchIconSmallGray />
						</figure>
						<Combobox
							autoSelect
							className="w-[101px] bg-custom-gray-6 text-sm font-normal leading-4 text-custom-gray-3 focus:outline-none"
							placeholder="Search..."
							role="grid"
							state={combobox}
						/>
					</div>
				</div>
				<div>
					<Slider
						color="#F58024"
						onChange={(sliderColor) => {
							setColor(sliderColor.hex);
							// setHsva({ ...hsva, ...sliderColor.hsv });
							if (onIconColorChange) {
								onIconColorChange(sliderColor.hex);
							}
						}}
					/>
				</div>
				<ComboboxList
					className="flex flex-col overflow-y-scroll pb-3 pt-2"
					id="icon-selector"
					state={combobox}
				>
					<ComboboxRow className="flex flex-wrap">
						<div className="flex flex-wrap" id="icon-selector">
							{combobox.matches.map((values, index) =>
								renderComboBoxItem(values, index),
							)}
						</div>
					</ComboboxRow>
					<div className="flex w-full justify-between pt-2">
						<Button
							isDisabled={currentPage === 1}
							onClick={() => onPaginationClick("prev")}
						>
							prev
						</Button>
						<span className=" text-[13px] font-medium">
							{currentPage}/{totalPagesValue}
						</span>
						<Button
							isDisabled={currentPage === totalPagesValue}
							onClick={() => onPaginationClick("next")}
						>
							next
						</Button>
					</div>
				</ComboboxList>
			</Menu>
		</>
	);
};

export default CategoryIconsDropdown;
