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
import { options } from "../../utils/commonData";

type CategoryIconsDropdownTypes = {
	iconValue: string | null;
	onIconSelect: (value: string) => void;
};

const CategoryIconsDropdown = (props: CategoryIconsDropdownTypes) => {
	const { onIconSelect, iconValue } = props;

	const defaultList = options?.map((item) => item?.label);

	const combobox = useComboboxState({
		defaultList,
	});
	const menu = useMenuState(combobox);

	// Resets combobox value when menu is closed
	if (!menu.mounted && combobox.value) {
		combobox.setValue("");
	}

	const renderItem = (value: string) => {
		const data = find(options, (item) => item?.label === value);

		return (
			<div className="h-[18px] w-[18px]" title={data?.label}>
				{data?.icon()}
			</div>
		);
	};

	const renderComboBoxItem = (value: string, index: number) => (
		<ComboboxItem
			// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
			className="data-active-item:bg-custom-gray-7 rounded-md p-1 hover:bg-custom-gray-7"
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
				{find(options, (item) => item?.label === iconValue)?.icon()}
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
				<ComboboxList className="flex flex-col pb-3 pt-2" state={combobox}>
					<ComboboxRow className="flex space-x-3">
						{combobox.matches.map((values, index) =>
							renderComboBoxItem(values, index),
						)}
					</ComboboxRow>
					{/* <ComboboxRow>
            {renderComboBoxItem(combobox.matches[0])}
            {renderComboBoxItem(combobox.matches[1])}
          </ComboboxRow> */}
				</ComboboxList>
			</Menu>
		</>
	);
};

export default CategoryIconsDropdown;
