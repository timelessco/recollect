import { useEffect, useState } from "react";

import isEmpty from "lodash/isEmpty";

import type { CategoriesData } from "../../../types/apiTypes";

import { Tooltip } from "@/components/ui/recollect/tooltip";

import { useUpdateCategoryOptimisticMutation } from "../../../async/mutationHooks/category/use-update-category-optimistic-mutation";
import { GlobeIcon } from "../../../icons/globe-icon";
import UsersCollabIcon from "../../../icons/usersCollabIcon";

interface NavBarHeadingProps {
  currentCategoryData: CategoriesData | undefined;
  headerName: string | undefined;
  triggerEdit?: boolean;
}

export const NavBarHeading = (props: NavBarHeadingProps) => {
  const { currentCategoryData, headerName, triggerEdit } = props;

  const [showHeadingInput, setShowHeadingInput] = useState(false);
  const [headingInputValue, setHeadingInputValue] = useState(headerName ?? "");

  useEffect(() => {
    if (headerName) {
      setHeadingInputValue(headerName);
    }
  }, [headerName]);

  useEffect(() => {
    if (triggerEdit) {
      setShowHeadingInput(true);
    }
  }, [triggerEdit]);

  const handleEditMode = () => {
    if (currentCategoryData) {
      setShowHeadingInput(true);
    }

    if (headerName) {
      setHeadingInputValue(headerName);
    }
  };

  if (!showHeadingInput) {
    return (
      <>
        <button
          className="truncate text-xl font-semibold text-gray-950"
          onClick={(event) => {
            event.preventDefault();
            if (event.detail === 2) {
              handleEditMode();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleEditMode();
            }
          }}
          tabIndex={currentCategoryData ? 0 : -1}
          type="button"
        >
          {headingInputValue}
        </button>

        <CollectionStatusIcons currentCategoryData={currentCategoryData} />
      </>
    );
  }

  return (
    <NavBarHeadingInput
      currentCategoryData={currentCategoryData}
      headingInputValue={headingInputValue}
      setHeadingInputValue={setHeadingInputValue}
      setShowHeadingInput={setShowHeadingInput}
    />
  );
};

interface NavBarHeadingInputProps {
  currentCategoryData: CategoriesData | undefined;
  headingInputValue: string;
  setHeadingInputValue: (value: string) => void;
  setShowHeadingInput: (value: boolean) => void;
}

const NavBarHeadingInput = (props: NavBarHeadingInputProps) => {
  const { currentCategoryData, headingInputValue, setHeadingInputValue, setShowHeadingInput } =
    props;

  const { updateCategoryOptimisticMutation } = useUpdateCategoryOptimisticMutation();

  const updateCategoryName = (categoryId: number, name: string) => {
    updateCategoryOptimisticMutation.mutate({
      category_id: categoryId,
      updateData: {
        category_name: name,
      },
    });
  };

  const handleSave = () => {
    setShowHeadingInput(false);

    if (
      currentCategoryData?.id &&
      !isEmpty(headingInputValue) &&
      headingInputValue !== currentCategoryData?.category_name
    ) {
      updateCategoryName(currentCategoryData?.id, headingInputValue);
    }
  };

  return (
    <input
      autoFocus
      className="m-0 h-[28px] rounded-none border-none bg-gray-0 p-0 text-xl leading-[16px] font-semibold text-gray-900 focus:outline-hidden"
      name="category-name"
      onBlur={handleSave}
      onChange={(event) => {
        setHeadingInputValue(event.target.value);
      }}
      onFocus={(event) => {
        event.target.select();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          handleSave();
        }
      }}
      placeholder="Enter name"
      type="text"
      value={headingInputValue}
    />
  );
};

interface CollectionStatusIconsProps {
  currentCategoryData: CategoriesData | undefined;
}

const CollectionStatusIcons = (props: CollectionStatusIconsProps) => {
  const { currentCategoryData } = props;

  const showPublicIcon = currentCategoryData?.is_public;
  const showSharedIcon =
    currentCategoryData?.collabData && currentCategoryData?.collabData?.length > 1;

  if (!showPublicIcon && !showSharedIcon) {
    return null;
  }

  return (
    <div className="ml-2 flex items-center justify-center space-x-2">
      {showPublicIcon && (
        <Tooltip content="Public collection">
          <figure className="text-gray-1000">
            <GlobeIcon />
          </figure>
        </Tooltip>
      )}
      {showSharedIcon && (
        <Tooltip content="Shared collection">
          <figure className="text-gray-1000">
            <UsersCollabIcon />
          </figure>
        </Tooltip>
      )}
    </div>
  );
};
