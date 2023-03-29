import React from "react";
import { type ActionMeta, type OnChangeValue } from "react-select";
// import Select from 'react-select';
import CreatableSelect from "react-select/creatable";

import { type TagInputOption } from "../types/componentTypes";

type TagInputProps = {
	addExistingTag: (
		value: OnChangeValue<TagInputOption, true>,
	) => Promise<void> | void;
	createTag: (
		value: OnChangeValue<TagInputOption, true>,
	) => Promise<void> | void;
	defaultValue: TagInputOption[] | undefined;
	options: TagInputOption[] | undefined;
	removeExistingTag: (value: TagInputOption) => Promise<void> | void;
};

const TagInput = (props: TagInputProps) => {
	const {
		options,
		createTag,
		addExistingTag,
		defaultValue,
		removeExistingTag,
	} = props;

	const handleChange = (
		newValue: OnChangeValue<TagInputOption, true>,
		actionMeta: ActionMeta<TagInputOption>,
	) => {
		if (actionMeta.action === "create-option") {
			void createTag(newValue);
		}

		if (actionMeta.action === "select-option") {
			void addExistingTag(newValue);
		}

		if (actionMeta.action === "remove-value") {
			void removeExistingTag(actionMeta.removedValue);
		}
	};

	return (
		<CreatableSelect
			defaultValue={defaultValue}
			isMulti
			key={defaultValue?.length}
			menuPortalTarget={document.body}
			onChange={handleChange}
			options={options}
			styles={{
				menuPortal: (provided) => ({
					...provided,
					zIndex: 9_999,
				}),
			}}
		/>
	);
};

export default TagInput;
