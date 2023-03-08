import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Mention, MentionsInput } from "react-mentions";

import SearchInputSearchIcon from "../icons/searchInputSearchIcon";
import {
  useLoadersStore,
  useMiscellaneousStore,
} from "../store/componentStore";
import type { UserTagsData } from "../types/apiTypes";
import { USER_TAGS_KEY } from "../utils/constants";

import Spinner from "./spinner";

const styles = {
  control: {
    backgroundColor: "rgba(0, 0, 0, 0.047)",
    fontSize: 14,
    fontWeight: 400,
    color: "#707070",

    width: 300,
    padding: "3px 10px 3px 28px",
    borderRadius: 8,
  },
  "&multiLine": {
    control: {},
    highlighter: {},
    input: {
      border: "unset",
      borderRadius: 8,
      padding: "inherit",
      outline: "unset",
    },
  },

  suggestions: {
    list: {
      // backgroundColor: "#FFFFFF",
      padding: "6px",
      boxShadow:
        "0px 0px 1px rgba(0, 0, 0, 0.19), 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 6px 15px -5px rgba(0, 0, 0, 0.11)",
      borderRadius: "12px",
      // border: "1px solid rgba(0,0,0,0.15)",
      // fontSize: 14,
    },
    item: {
      padding: "7px 8px",
      borderRadius: "8px",
      fontWeight: "450",
      fontSize: "13px",
      lineHeight: "15px",
      color: "#383838",

      // borderBottom: "1px solid rgba(0,0,0,0.15)",
      "&focused": {
        backgroundColor: "#EDEDED",
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

  const searchText = useMiscellaneousStore(state => state.searchText);
  const isSearchLoading = useLoadersStore(state => state.isSearchLoading);

  const userTagsData = queryClient.getQueryData([USER_TAGS_KEY, userId]) as {
    data: UserTagsData[];
    error: PostgrestError;
  };

  return (
    <div className=" relative">
      <figure className=" absolute top-[7px] left-[9px]">
        <SearchInputSearchIcon />
      </figure>
      <MentionsInput
        // eslint-disable-next-line tailwindcss/no-custom-classname
        className="search-bar"
        value={searchText}
        placeholder={placeholder}
        onChange={(e: { target: { value: string } }) =>
          onChange(e.target.value)
        }
        style={styles}
      >
        <Mention
          markup="@__display__"
          trigger="#"
          data={userTagsData?.data?.map(item => {
            return {
              id: item?.id,
              display: item?.name,
            };
          })}
          // style={{
          //   backgroundColor: "#cee4e5",
          //   with: "100%",
          // }}
        />
      </MentionsInput>
      {isSearchLoading && (
        <div className=" absolute top-0 right-2">
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default SearchInput;
