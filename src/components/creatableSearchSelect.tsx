import { type ActionMeta, type OnChangeValue } from "react-select";
import CreatableSelect from "react-select/creatable";

import { type SearchSelectOption } from "../types/componentTypes";

type CreatableSearchSelectProps = {
	createOption: (value: SearchSelectOption | null) => Promise<void> | void;
	defaultValue: SearchSelectOption;
	isLoading: boolean;
	onChange: (value: SearchSelectOption | null) => Promise<void> | void;
	options: SearchSelectOption[];
};

const CreatableSearchSelect = (props: CreatableSearchSelectProps) => {
	const { options, defaultValue, onChange, isLoading, createOption } = props;

	const handleChange = (
		newValue: OnChangeValue<SearchSelectOption, false>,
		actionMeta: ActionMeta<SearchSelectOption>,
	) => {
		if (actionMeta.action === "select-option") {
			void onChange(newValue);
		}

		if (actionMeta.action === "create-option") {
			void createOption(newValue);
		}
	};

	return (
		<CreatableSelect
			defaultValue={defaultValue}
			isClearable
			isLoading={isLoading}
			key={defaultValue?.value}
			// @ts-expect-error - type this properly
			menuPortalTarget={document.querySelector("#modal-parent")}
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

export default CreatableSearchSelect;
