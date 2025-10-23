import { startTransition, useMemo, useState } from "react";
import * as Ariakit from "@ariakit/react";
import classNames from "classnames";
import { isEmpty } from "lodash";
import { matchSorter } from "match-sorter";

import { Spinner } from "../spinner";

type AriaSearchableSelectTypes = {
	defaultValue: string;
	isLoading: boolean;
	list: string[];
	onChange: (value: string) => void;
	onCreate: (value: string) => void;
};

const AriaSearchableSelect = ({
	list,
	defaultValue,
	onChange,
	onCreate,
	isLoading,
}: AriaSearchableSelectTypes) => {
	const [searchValue, setSearchValue] = useState("");

	const matches = useMemo(
		() =>
			isEmpty(searchValue)
				? list
				: matchSorter(list, searchValue, {
						baseSort: (a, b) => (a.index < b.index ? -1 : 1),
				  }),
		[searchValue, list],
	);

	const menuItemClassName =
		"rounded-lg cursor-pointer px-2 py-[5px] text-13 font-450 leading-[15px] tracking-[1%] text--gray-900 data-[active-item]:bg-surface-gray-3 truncate";

	const mainWrapperClassName = classNames({
		"py-[7px] px-[10px] rounded-lg  w-full": true,
		"flex items-center": true,
		"bg-surface-gray-2": true,
	});

	return (
		<div className={mainWrapperClassName}>
			<Ariakit.ComboboxProvider
				resetValueOnHide
				setValue={(value) => {
					startTransition(() => {
						setSearchValue(value);
					});
				}}
			>
				<Ariakit.SelectProvider
					setValue={(value) => {
						setSearchValue(value);

						const isNew = !list?.includes(value);

						if (isNew) {
							onCreate(searchValue);
						} else {
							onChange(value);
						}

						setSearchValue("");
					}}
					value={isEmpty(defaultValue) ? "Uncategorized" : defaultValue}
				>
					<Ariakit.Select className="aria-multi-select flex w-full items-center justify-between text-13 font-450 leading-[15px] tracking-[1%] text-text-gray-8 outline-none" />
					{isLoading && (
						<Spinner
							className="h-3 w-3 animate-spin"
							style={{ color: "var(--plain-reverse-color)" }}
						/>
					)}
					<Ariakit.SelectPopover
						className="z-10 rounded-xl bg-surface-gray-cards p-[6px] shadow-custom-7"
						gutter={4}
						sameWidth
					>
						<div className="px-2 py-[5px]">
							<Ariakit.Combobox
								autoSelect
								className="w-full bg-transparent text-sm font-normal leading-4 text-text-gray-5 outline-none"
								placeholder="Search..."
							/>
						</div>
						<Ariakit.ComboboxList>
							{matches.map((value) => (
								<Ariakit.SelectItem
									className={menuItemClassName}
									key={value}
									render={<Ariakit.ComboboxItem />}
									value={value}
								/>
							))}
						</Ariakit.ComboboxList>
					</Ariakit.SelectPopover>
				</Ariakit.SelectProvider>
			</Ariakit.ComboboxProvider>
		</div>
	);
};

export default AriaSearchableSelect;
