import React from 'react';
// import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, OnChangeValue } from 'react-select';

interface ColourOption {
  readonly value: string;
  readonly label: string;
  readonly color?: string;
  readonly isFixed?: boolean;
  readonly isDisabled?: boolean;
}

const options = [
  { value: 'chocolate', label: 'Chocolate' },
  { value: 'strawberry', label: 'Strawberry' },
  { value: 'vanilla', label: 'Vanilla' },
];

const handleChange = (
  newValue: OnChangeValue<ColourOption, true>,
  actionMeta: ActionMeta<ColourOption>
) => {
  console.group('Value Changed');
  console.log(newValue);
  console.log(`action: ${actionMeta.action}`);
  console.groupEnd();
};

const TagInput = () => (
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

export default TagInput;
