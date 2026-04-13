import { useCallback, useEffect, useMemo, useState } from "react";
import { Mention, MentionsInput } from "react-mentions";
import type { MentionsInputProps } from "react-mentions";

import { isEmpty } from "lodash";

import type { CategoriesData } from "@/types/apiTypes";
import type { CategoryIdUrlTypes } from "@/types/componentTypes";

import useFetchUserTags from "@/async/queryHooks/userTags/useFetchUserTags";
import Button from "@/components/atoms/button";
import { Spinner } from "@/components/spinner";
import useDebounce from "@/hooks/useDebounce";
import SearchInputSearchIcon from "@/icons/searchInputSearchIcon";
import { useLoadersStore, useMiscellaneousStore } from "@/store/componentStore";
import { extractTagNamesFromSearch } from "@/utils/helpers";
import { CSS_COLOR_NAMES, KNOWN_TYPES } from "@/utils/searchTokens";

const SEARCH_DEBOUNCE_MS = 500;

const CSS_COLOR_NAMES_ARRAY = [...CSS_COLOR_NAMES].toSorted();
const KNOWN_TYPES_ARRAY = [...KNOWN_TYPES].toSorted();

const MAX_COLOR_SUGGESTIONS = 5;
const MAX_TYPE_SUGGESTIONS = 5;
const MIN_QUERY_LENGTH_FOR_EXTRAS = 2;

interface SearchBarProps {
  categoryId: CategoryIdUrlTypes;
  currentCategoryData: CategoriesData | undefined;
  currentPath: null | string;
  isDesktop: boolean;
  onShowSearchBar: (value: boolean) => void;
  showSearchBar: boolean;
}

export function SearchBar(props: SearchBarProps) {
  const {
    categoryId,
    currentCategoryData,
    currentPath,
    isDesktop,
    onShowSearchBar,
    showSearchBar,
  } = props;

  const setSearchText = useMiscellaneousStore((state) => state.setSearchText);

  useEffect(() => {
    setSearchText("");
  }, [categoryId, setSearchText]);

  if (showSearchBar) {
    return (
      <div className="w-[246px] max-lg:my-[2px] max-lg:w-full">
        <SearchInput
          key={categoryId}
          onBlur={() => {
            if (!isDesktop) {
              onShowSearchBar(false);
            }
          }}
          placeholder={`Search in ${currentCategoryData?.category_name ?? currentPath}`}
        />
      </div>
    );
  }

  return (
    <Button
      className="mr-1 bg-transparent hover:bg-transparent"
      onClick={() => {
        onShowSearchBar(true);
      }}
    >
      <SearchInputSearchIcon color="var(--color-gray-1000)" size="16" />
    </Button>
  );
}

interface SearchInputTypes {
  onBlur: () => void;
  placeholder: string;
}

const SearchInput = (props: SearchInputTypes) => {
  const { onBlur, placeholder } = props;
  const [addedTags, setAddedTags] = useState<string[] | undefined>([]);
  const [isFocused, setIsFocused] = useState(false);
  const setSearchText = useMiscellaneousStore((state) => state.setSearchText);

  const [localValue, setLocalValue] = useState("");
  const debouncedValue = useDebounce(localValue, SEARCH_DEBOUNCE_MS);

  // Sync debounced value to store - API only fires after user stops typing for 500ms
  useEffect(() => {
    setSearchText(debouncedValue);
  }, [debouncedValue, setSearchText]);

  const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);
  const { userTags } = useFetchUserTags();
  const userTagsData = useMemo(() => userTags?.data ?? [], [userTags]);

  const filteredTagsData = useMemo(
    () =>
      userTagsData
        ?.map((item) => ({
          display: item?.name || "",
          id: String(item?.id || ""),
        }))
        ?.filter((filterItem) => !addedTags?.includes(filterItem?.display || "")),
    [userTagsData, addedTags],
  );

  /* eslint-disable promise/prefer-await-to-callbacks -- react-mentions data prop requires callback pattern; async is not supported */
  const getSuggestions = useCallback(
    (query: string, callback: (data: { display: string; id: string }[]) => void) => {
      const q = query.toLowerCase();

      const tags = filteredTagsData.filter((t) => t.display.toLowerCase().includes(q));

      if (q.length < MIN_QUERY_LENGTH_FOR_EXTRAS) {
        callback(tags);
        return;
      }

      const tagNames = new Set(tags.map((t) => t.display.toLowerCase()));

      const colors = CSS_COLOR_NAMES_ARRAY.filter((c) => c.startsWith(q) && !tagNames.has(c))
        .slice(0, MAX_COLOR_SUGGESTIONS)
        .map((c) => ({ display: c, id: `color:${c}` }));

      const types = KNOWN_TYPES_ARRAY.filter((t) => t.startsWith(q) && !tagNames.has(t))
        .slice(0, MAX_TYPE_SUGGESTIONS)
        .map((t) => ({ display: t, id: `type:${t}` }));

      callback([...tags, ...colors, ...types]);
    },
    [filteredTagsData],
  );
  /* eslint-enable promise/prefer-await-to-callbacks */

  const handleChange = (value: string) => {
    setLocalValue(value);
    setAddedTags(extractTagNamesFromSearch(value));
    if (!value) {
      setSearchText("");
    }
  };

  return (
    <div className="search-wrapper relative">
      <figure className="absolute top-[7px] left-[9px] z-5">
        <SearchInputSearchIcon
          color={isFocused ? "var(--color-gray-900)" : "var(--color-gray-600)"}
          size="14"
        />
      </figure>
      <MentionsInput
        className="search-bar"
        onBlur={() => {
          setIsFocused(false);
          onBlur();
        }}
        onChange={(event: { target: { value: string } }) => {
          handleChange(event.target.value);
        }}
        onFocus={() => {
          setIsFocused(true);
        }}
        placeholder={placeholder}
        singleLine
        style={styles}
        value={localValue}
      >
        <Mention
          appendSpaceOnAdd
          data={getSuggestions}
          displayTransform={(_url, display) => `#${display}`}
          markup="#[__display__](__id__)"
          trigger="#"
        />
      </MentionsInput>
      {isSearchLoading && !isEmpty(localValue) && (
        <div className="absolute top-1/2 right-2 -translate-y-1/2">
          <Spinner
            className="h-3 w-3 animate-spin"
            style={{ color: "var(--color-plain-reverse)" }}
          />
        </div>
      )}
    </div>
  );
};

const styles: MentionsInputProps["style"] = {
  "&multiLine": {
    control: {},
    highlighter: {},
    input: {
      border: "unset",
      borderRadius: 8,
      outline: "unset",
      padding: "inherit",
    },
  },
  control: {
    backgroundColor: "var(--color-gray-alpha-100)",

    borderRadius: 11,
    color: "var(--color-gray-800)",
    fontSize: 14,
    fontWeight: 400,

    height: 30,
    lineHeight: "16px",
    padding: "6px",
    width: "100%",
  },
  input: {
    left: 27,
    top: 6.5,
    width: "80%",
  },

  suggestions: {
    backgroundColor: "transparent",
    item: {
      "&focused": {
        backgroundColor: "var(--color-gray-200)",
      },
      borderRadius: "8px",
      color: "var(--color-gray-800)",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "450",
      lineHeight: "15px",
      padding: "7px 8px",

      transition: "plain-color 0.2s ease",
    },
    list: {
      backgroundColor: "var(--color-plain)",

      borderRadius: "12px",
      boxShadow:
        "0px 0px 1px rgba(0, 0, 0, 0.19), 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 6px 15px -5px rgba(0, 0, 0, 0.11)",
      marginTop: "20px",
      maxHeight: "220px",
      maxWidth: "260px",
      overflowY: "auto",
      padding: "4px",
    },
    zIndex: 5,
  },
};
