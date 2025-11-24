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
import { isEmpty } from "lodash";
import { matchSorter } from "match-sorter";

import { type ChildrenTypes } from "../../types/componentTypes";

/**
 * Checks if a tag exists in the provided array (case-insensitive, trimmed).
 * @param array - Array of tags (string, undefined, or null)
 * @param tag - Tag to check
 * @returns true if tag exists in arr, false otherwise
 */
const tagExists = (
	array: Array<string | null | undefined> | undefined,
	tag: string,
): boolean =>
	Boolean(
		array?.some(
			(item) =>
				typeof item === "string" &&
				item?.trim()?.toLowerCase() === tag?.trim()?.toLowerCase(),
		),
	);

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
					className="ml-1 w-full bg-inherit text-sm leading-4 font-normal text-gray-600 outline-hidden"
					id={inputId}
					ref={ref}
					store={combobox}
					{...comboboxProps}
				/>
				<Ariakit.ComboboxPopover
					className="z-10 rounded-xl bg-gray-0 p-[6px] shadow-custom-7"
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
	"rounded-lg px-2 py-[5px] cursor-pointer text-13 font-450 leading-[15px] tracking-[0.01em] text-gray-900 data-active-item:bg-gray-200 truncate";

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
		className="mx-[2px] my-0.5 mr-1 cursor-pointer truncate rounded-md bg-gray-800 px-2 py-[2px] text-xs leading-[15px] font-450 tracking-[0.01em] text-white"
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

	// Always allow wrapping and set a minimum height for single line
	const mainWrapperClassName = classNames(
		"py-[3px] px-[10px] rounded-lg w-full bg-gray-100 flex items-center flex-wrap min-h-[30px]",
	);

	return (
		<div className={mainWrapperClassName}>
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
			<div className="min-w-[120px] flex-1">
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
					{/* Only show "Create new tag" if the value does not already exist in
					either the available list or the currently selected values. Comparison
					is case-insensitive and ignores whitespace. */}
					{!isEmpty(value) &&
						!tagExists(list, value) &&
						!tagExists(values, value) && (
							<ComboboxItem key="addnew1" value={value}>
								{`Create new "${value}" tag`}
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
