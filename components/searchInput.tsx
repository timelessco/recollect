import React from 'react';
import SearchIconSmallGray from '../icons/searchIconSmallGray';

interface SearchInputTypes {
  placeholder: string;
  onChange: (value: string) => void;
}

const SearchInput = (props: SearchInputTypes) => {
  const { placeholder, onChange } = props;
  return (
    <div className="flex items-center bg-custom-gray-6 w-[228px] rounded-[54px] py-[7px] px-[10px]">
      <figure className="w-3 h-3">
        <SearchIconSmallGray />
      </figure>
      <input
        id="bookmarks-search-input"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ml-[6px] w-full bg-custom-gray-6 text-custom-gray-3 text-sm font-normal leading-4 focus:outline-none"
      />
    </div>
  );
};

export default SearchInput;
