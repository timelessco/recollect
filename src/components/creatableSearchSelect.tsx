import type { ActionMeta, OnChangeValue } from "react-select";
import CreatableSelect from "react-select/creatable";

import type { SearchSelectOption } from "../types/componentTypes";

interface CreatableSearchSelectProps {
  options: SearchSelectOption[];
  defaultValue: SearchSelectOption;
  onChange: (value: SearchSelectOption | null) => void | Promise<void>;
  isLoading: boolean;
  createOption: (value: SearchSelectOption | null) => void | Promise<void>;
}

const CreatableSearchSelect = (props: CreatableSearchSelectProps) => {
  const { options, defaultValue, onChange, isLoading, createOption } = props;

  const handleChange = (
    newValue: OnChangeValue<SearchSelectOption, false>,
    actionMeta: ActionMeta<SearchSelectOption>,
  ) => {
    if (actionMeta.action === "select-option") {
      onChange(newValue)?.catch(() => {});
    }

    if (actionMeta.action === "create-option") {
      createOption(newValue)?.catch(() => {});
    }
  };

  return (
    <CreatableSelect
      key={defaultValue?.value}
      isLoading={isLoading}
      isClearable
      onChange={handleChange}
      options={options}
      defaultValue={defaultValue}
      menuPortalTarget={document.getElementById("modal-parent")}
      styles={{
        menuPortal: provided => ({
          ...provided,
          zIndex: 9999,
        }),
      }}
    />
  );
};

export default CreatableSearchSelect;
