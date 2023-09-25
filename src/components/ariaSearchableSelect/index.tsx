import { startTransition, useEffect, useMemo, useState } from "react";
import * as Ariakit from "@ariakit/react";
import classNames from "classnames";
import { find, isEmpty, isNil } from "lodash";
import { matchSorter } from "match-sorter";

type AriaSearchableSelectTypes = {
	defaultValue: string;
	list: string[];
	onChange: (value: string) => void;
	onCreate: (value: string) => void;
};

const AriaSearchableSelect = ({
	list,
	defaultValue,
	onChange,
	onCreate,
}: AriaSearchableSelectTypes) => {
	const [searchValue, setSearchValue] = useState("");
	const matches = useMemo(
		() => (isEmpty(searchValue) ? list : matchSorter(list, searchValue)),
		[searchValue, list],
	);

	useEffect(() => {
		if (!isNil(defaultValue)) {
			setSearchValue(defaultValue);
		} else {
			setSearchValue("");
		}
	}, [defaultValue]);

	const combobox = Ariakit.useComboboxStore({
		value: searchValue,
		setValue: (value) => setSearchValue(value),
		// setItems: (items) => console.log("item", items) // gives the filtered list
	});

	const select = Ariakit.useSelectStore({
		combobox,
		value: searchValue,
		setValue: (value) => {
			setSearchValue(value);

			const isNew = !list?.includes(value);

			if (isNew) {
				onCreate(searchValue);
			} else {
				onChange(value);
			}
		},
	});

	const menuItemClassName =
		"rounded-lg cursor-pointer px-2 py-[5px] text-13 font-450 leading-[15px] tracking-[1%] text-gray-light-12 data-[active-item]:bg-gray-light-4 truncate";

	const mainWrapperClassName = classNames({
		"py-[7px] px-[10px] rounded-lg  w-full": true,
		"flex items-center": true,
		"bg-overlay-black-A/3": true,
	});

	return (
		<div className={mainWrapperClassName}>
			<Ariakit.ComboboxProvider
				setValue={(value) => {
					startTransition(() => setSearchValue(value));
				}}
			>
				<Ariakit.Combobox
					className="ml-1 w-full bg-transparent text-sm font-normal leading-4 text-grayDark-grayDark-600 outline-none"
					placeholder="e.g., Apple"
					store={combobox}
				/>
				<Ariakit.ComboboxPopover
					className="z-10 rounded-xl bg-white p-[6px] shadow-custom-7"
					gutter={8}
					render={<Ariakit.SelectList store={select} />}
					sameWidth
					store={combobox}
				>
					{matches.length
						? matches.map((value) => (
								// eslint-disable-next-line react/jsx-indent
								<Ariakit.SelectItem
									className={menuItemClassName}
									key={value}
									render={<Ariakit.ComboboxItem />}
									value={value}
								/>
						  ))
						: null}
					{!isEmpty(searchValue) &&
						!find(list, (findItem) => findItem === searchValue) && (
							<Ariakit.SelectItem
								className={menuItemClassName}
								key="create_new_item"
								render={<Ariakit.ComboboxItem />}
								value="Create new"
							/>
						)}
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
		</div>
	);
};

export default AriaSearchableSelect;
