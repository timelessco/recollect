import React from 'react';
// import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, OnChangeValue } from 'react-select';
import { TagInputOption } from '../types/componentTypes';

interface TagInputProps {
  options: Array<TagInputOption> | undefined;
  createTag: (value: OnChangeValue<TagInputOption, true>) => void;
  addExistingTag: (value: OnChangeValue<TagInputOption, true>) => void;
}

const TagInput = (props: TagInputProps) => {
  const { options, createTag, addExistingTag } = props;

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
  };

  return (
    <CreatableSelect
      options={options}
      // defaultValue={[options[1]]}
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
