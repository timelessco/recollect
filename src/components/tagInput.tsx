import React from "react";
import type { ActionMeta, OnChangeValue } from "react-select";
// import Select from 'react-select';
import CreatableSelect from "react-select/creatable";

import type { TagInputOption } from "../types/componentTypes";

interface TagInputProps {
  options: Array<TagInputOption> | undefined;
  createTag: (
    value: OnChangeValue<TagInputOption, true>,
  ) => void | Promise<void>;
  addExistingTag: (
    value: OnChangeValue<TagInputOption, true>,
  ) => void | Promise<void>;
  defaultValue: Array<TagInputOption> | undefined;
  removeExistingTag: (value: TagInputOption) => void | Promise<void>;
}

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
      createTag(newValue)?.catch(() => {});
    }

    if (actionMeta.action === "select-option") {
      addExistingTag(newValue)?.catch(() => {});
    }

    if (actionMeta.action === "remove-value") {
      removeExistingTag(actionMeta.removedValue)?.catch(() => {});
    }
  };

  return (
    <CreatableSelect
      key={defaultValue?.length}
      options={options}
      defaultValue={defaultValue}
      isMulti
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

export default TagInput;
