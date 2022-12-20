import React from 'react';
import { MentionsInput, Mention } from 'react-mentions';
import { useMiscellaneousStore } from '../store/componentStore';
import { USER_TAGS_KEY } from '../utils/constants';
import { UserTagsData } from '../types/apiTypes';
import { PostgrestError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

const styles = {
  control: {
    backgroundColor: '#ECECEC',
    fontSize: 14,
    width: 220,
    padding: '3px 10px 3px 28px',
    borderRadius: 54,
  },

  '&multiLine': {
    control: {},
    highlighter: {},
    input: {
      border: 'unset',
      borderRadius: 54,
      padding: 'inherit',
    },
  },

  suggestions: {
    list: {
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.15)',
      fontSize: 14,
    },
    item: {
      padding: '5px 15px',
      borderBottom: '1px solid rgba(0,0,0,0.15)',
      '&focused': {
        backgroundColor: '#cee4e5',
      },
    },
  },
};

interface SearchInputTypes {
  placeholder: string;
  onChange: (value: string) => void;
  userId: string;
}

const SearchInput = (props: SearchInputTypes) => {
  const { placeholder, onChange, userId } = props;

  const queryClient = useQueryClient();

  const searchText = useMiscellaneousStore((state) => state.searchText);

  const userTagsData = queryClient.getQueryData([USER_TAGS_KEY, userId]) as {
    data: UserTagsData[];
    error: PostgrestError;
  };

  // return (
  //   <div className="flex items-center bg-custom-gray-6 w-[228px] rounded-[54px] py-[7px] px-[10px]">
  //     <figure className="w-3 h-3">
  //       <SearchIconSmallGray />
  //     </figure>
  //     <input
  //       id="bookmarks-search-input"
  //       onChange={(e) => onChange(e.target.value)}
  //       placeholder={placeholder}
  //       className="ml-[6px] w-full bg-custom-gray-6 text-custom-gray-3 text-sm font-normal leading-4 focus:outline-none"
  //     />
  //   </div>
  // );

  return (
    <MentionsInput
      value={searchText}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={styles}
    >
      <Mention
        markup="@__display__"
        trigger="#"
        data={userTagsData?.data?.map((item) => {
          return {
            id: item?.id,
            display: item?.name,
          };
        })}
        style={{
          backgroundColor: '#cee4e5',
        }}
      />
    </MentionsInput>
  );
};

export default SearchInput;
