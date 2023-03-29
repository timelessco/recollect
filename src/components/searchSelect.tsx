import React from "react";
import Select from "react-select";

import { type SearchSelectOption } from "../types/componentTypes";

type SearchSelectProps = {
	defaultValue: SearchSelectOption[];
	isLoading: boolean;
	onChange: (value: SearchSelectOption | null) => void;
	options: SearchSelectOption[];
};

const SearchSelect = (props: SearchSelectProps) => {
	const { options, onChange, defaultValue, isLoading = false } = props;

	const handleChange = (
		value: SearchSelectOption | null,
		// actionMeta: ActionMeta<SearchSelectOption>
	) => {
		onChange(value);
	};

	return (
		<Select
			defaultValue={defaultValue}
			isLoading={isLoading}
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

export default SearchSelect;
