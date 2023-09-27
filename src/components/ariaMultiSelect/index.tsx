import {
	forwardRef,
	useDeferredValue,
	useEffect,
	useId,
	useMemo,
	useState,
	type ComponentPropsWithoutRef,
} from "react";
import * as Ariakit from "@ariakit/react";
import classNames from "classnames";
import { find, isEmpty } from "lodash";
import { matchSorter } from "match-sorter";

import { type ChildrenTypes } from "../../types/componentTypes";

export type ComboboxProps = Omit<
	ComponentPropsWithoutRef<"input">,
	"onChange"
> & {
	autoSelect: boolean;
	defaultValue?: string;
	defaultValues?: string[];
	label?: string;
	onChange?: (value: string[] | string) => void;
	onValuesChange?: (values: string[]) => void;
	value?: string;
	values?: string[];
};

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
	(props, ref) => {
		const {
			label,
			defaultValue,
			value,
			onChange,
			defaultValues,
			values,
			onValuesChange,
			children,
			...comboboxProps
		} = props;

		const combobox = Ariakit.useComboboxStore({
			value,
			setValue: onChange,
			defaultValue,
			resetValueOnHide: true,
		});

		const select = Ariakit.useSelectStore({
			combobox,
			value: values,
			setValue: onValuesChange,
			defaultValue: defaultValues,
		});

		const selectValue = select.useState("value");

		// Reset the combobox value whenever an item is checked or unchecked.
		useEffect(() => combobox.setValue(""), [selectValue, combobox]);

		const defaultInputId = useId();
		const inputId = comboboxProps.id ?? defaultInputId;

		return (
			<>
				{label && <label htmlFor={inputId}>{label}</label>}
				<Ariakit.Combobox
					className="ml-1 w-full bg-inherit text-sm font-normal leading-4 text-grayDark-grayDark-600 outline-none "
					id={inputId}
					ref={ref}
					store={combobox}
					{...comboboxProps}
				/>
				<Ariakit.ComboboxPopover
					className="z-10 rounded-xl bg-white p-[6px] shadow-custom-7"
					gutter={8}
					render={<Ariakit.SelectList store={select} />}
					sameWidth
					store={combobox}
				>
					{children}
				</Ariakit.ComboboxPopover>
			</>
		);
	},
);

export type ComboboxItemProps = ComponentPropsWithoutRef<"div"> & {
	value?: string;
};

const menuItemClassName =
	"rounded-lg px-2 py-[5px] cursor-pointer text-13 font-450 leading-[15px] tracking-[1%] text-gray-light-12 data-[active-item]:bg-gray-light-4 truncate";

export const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(
	(props, ref) => (
		// Here we're combining both SelectItem and ComboboxItem into the same
		// element. SelectItem adds the multi-selectable attributes to the element
		// (for example, aria-selected).
		<Ariakit.SelectItem
			className={menuItemClassName}
			ref={ref}
			{...props}
			render={<Ariakit.ComboboxItem />}
		>
			{props.children ?? props.value}
		</Ariakit.SelectItem>
	),
);

type TagTypes = {
	children: ChildrenTypes;
	onClick: () => void;
};

const Tag = ({ children, onClick }: TagTypes) => (
	<div
		className="mx-[2px] cursor-pointer  rounded-md bg-custom-gray-1 px-2 py-[2px] text-xs font-450 leading-[15px] tracking-[1%] text-white"
		onClick={onClick}
		onKeyDown={() => {}}
		role="button"
		tabIndex={0}
	>
		{children}
	</div>
);

type AriaMultiSelectTypes = {
	defaultList: string[];
	list: string[];
	onChange: (
		type: "add" | "create" | "remove",
		value: string[] | string,
	) => void;
	placeholder: string;
};
// main
const AriaMultiSelect = ({
	placeholder,
	list,
	defaultList,
	onChange,
}: AriaMultiSelectTypes) => {
	const [value, setValue] = useState("");
	const [values, setValues] = useState<string[]>(defaultList);
	const deferredValue = useDeferredValue(value);
	const matches = useMemo(
		() => matchSorter(list, deferredValue),
		[deferredValue, list],
	);

	useEffect(() => {
		setValues(defaultList);
	}, [defaultList, defaultList.length]);

	const filtertedMatch = matches?.filter((item) => !values?.includes(item));
	const breakValue = values?.length < 7;

	const mainWrapperClassName = classNames({
		"py-[7px] px-[10px] rounded-lg  w-full": true,
		"flex items-center": breakValue,
		"bg-overlay-black-A/3": true,
		"h-[30px]": true,
	});

	const tagsWrapperClassName = classNames({
		"flex items-center": true,
		"flex-wrap": !breakValue,
	});

	return (
		<div className={mainWrapperClassName}>
			<div className={tagsWrapperClassName}>
				{values?.map((item) => (
					<Tag
						key={item}
						onClick={() => {
							onChange("remove", item);
						}}
					>
						{item}
					</Tag>
				))}
			</div>
			<div className="w-full">
				<Combobox
					autoComplete="both"
					autoSelect
					label=""
					onChange={(changeValue: string[] | string) => {
						setValue(changeValue as string);
					}}
					onKeyDown={(event) => {
						if (event.code === "Backspace" && isEmpty(value)) {
							onChange("remove", values[values?.length - 1]);
						}
					}}
					onValuesChange={(allTags) => {
						const addingValue = allTags[allTags?.length - 1];

						const isNewTag = !list?.includes(addingValue);

						if (!isNewTag) {
							onChange("add", allTags);
						} else {
							onChange("create", addingValue);
						}
					}}
					placeholder={placeholder}
					value={value}
					values={values}
				>
					{filtertedMatch.map((matchValue, index) => (
						<ComboboxItem key={`${matchValue + index}`} value={matchValue} />
					))}
					{!isEmpty(value) && !find(list, (findItem) => findItem === value) && (
						<ComboboxItem key="addnew1" value={value}>
							Create new "{value}" tag
						</ComboboxItem>
					)}
					{isEmpty(filtertedMatch) && (
						<div className={menuItemClassName}>No results</div>
					)}
				</Combobox>
			</div>
		</div>
	);
};

export default AriaMultiSelect;
