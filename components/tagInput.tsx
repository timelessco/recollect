import React from 'react';
// import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, OnChangeValue } from 'react-select';
import { TagInputOption } from '../types/componentTypes';

interface TagInputProps {
  options: Array<TagInputOption> | undefined;
  createTag: (value: OnChangeValue<TagInputOption, true>) => void;
  addExistingTag: (value: OnChangeValue<TagInputOption, true>) => void;
  defaultValue: Array<TagInputOption> | undefined;
  removeExistingTag: (value: TagInputOption) => void;
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
    actionMeta: ActionMeta<TagInputOption>
  ) => {
    if (actionMeta.action === 'create-option') {
      createTag(newValue);
    }

    if (actionMeta.action === 'select-option') {
      addExistingTag(newValue);
    }

    if (actionMeta.action === 'remove-value') {
      removeExistingTag(actionMeta.removedValue);
    }
  };

  return (
    <CreatableSelect
      options={options}
      defaultValue={defaultValue}
      isMulti
      menuPortalTarget={document.body}
      onChange={handleChange}
      styles={{
        menuPortal: (provided) => ({
          ...provided,
          zIndex: 9999,
        }),
      }}
    />
  );
};

export default TagInput;
