import { ActionMeta, OnChangeValue } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { SearchSelectOption } from '../types/componentTypes';

interface CreatableSearchSelectProps {
  options: SearchSelectOption[];
  defaultValue: SearchSelectOption[];
  onChange: (value: SearchSelectOption | null) => void;
  isLoading: boolean;
  createOption: (value: SearchSelectOption | null) => void;
}

const CreatableSearchSelect = (props: CreatableSearchSelectProps) => {
  const { options, defaultValue, onChange, isLoading, createOption } = props;

  const handleChange = (
    newValue: OnChangeValue<SearchSelectOption, false>,
    actionMeta: ActionMeta<SearchSelectOption>
  ) => {
    if (actionMeta.action === 'select-option') {
      onChange(newValue);
    }

    if (actionMeta.action === 'create-option') {
      createOption(newValue);
    }
  };

  return (
    <CreatableSelect
      isLoading={isLoading}
      isClearable
      onChange={handleChange}
      // onInputChange={handleInputChange}
      options={options}
      defaultValue={defaultValue}
      menuPortalTarget={document.body}
      styles={{
        menuPortal: (provided) => ({
          ...provided,
          zIndex: 9999,
        }),
      }}
    />
  );
};

export default CreatableSearchSelect;
