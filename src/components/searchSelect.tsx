import React from "react";
import Select from "react-select";

import type { SearchSelectOption } from "../types/componentTypes";

interface SearchSelectProps {
  options: Array<SearchSelectOption>;
  onChange: (value: SearchSelectOption | null) => void;
  defaultValue: Array<SearchSelectOption>;
  isLoading: boolean;
}

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
      isLoading={isLoading}
      options={options}
      defaultValue={defaultValue}
      menuPortalTarget={document.body}
      onChange={handleChange}
      styles={{
        menuPortal: provided => ({
          ...provided,
          zIndex: 9999,
        }),
      }}
    />
  );
};

export default SearchSelect;
