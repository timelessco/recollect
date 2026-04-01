import router from "next/router";
import { useState } from "react";
import type { ReactNode } from "react";

import { isNull } from "lodash";

import { useAddCategoryOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-optimistic-mutation";
import useFetchUserProfile from "@/async/queryHooks/user/useFetchUserProfile";
import { Collapsible } from "@/components/ui/recollect/collapsible";
import { Menu } from "@/components/ui/recollect/menu";
import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";
import { MAX_TAG_COLLECTION_NAME_LENGTH, MIN_TAG_COLLECTION_NAME_LENGTH } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";

import AddCategoryIcon from "../../../icons/addCategoryIcon";
import DownArrowGray from "../../../icons/downArrowGray";
import OptionsIcon from "../../../icons/optionsIcon";
import { CollectionsListSkeleton } from "./collectionLIstSkeleton";

interface CollectionsListSectionHeaderProps {
  onAddCollectionClick: () => void;
}
interface CollectionsListSectionProps {
  children: ReactNode;
  isLoading: boolean;
}

export function CollectionsListSection({ children, isLoading }: CollectionsListSectionProps) {
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);

  return (
    <Collapsible.Root>
      <div className="pt-3">
        <div className="group flex w-full items-center justify-between px-1 py-[7px]">
          <Collapsible.Trigger>
            <div className="flex items-center text-13 leading-[14.95px] font-medium tracking-[0.02em] text-gray-600">
              <p className="mr-1">Collections</p>
              <DownArrowGray
                className="collections-sidepane-down-arrow hidden pt-px text-gray-500 group-hover:block"
                size={10}
              />
            </div>
          </Collapsible.Trigger>
          <CollectionsHeaderOptionsPopover
            onAddCollectionClick={() => {
              setShowAddCategoryInput(true);
            }}
          />
        </div>
      </div>
      <Collapsible.Panel>
        <div id="collections-wrapper">{isLoading ? <CollectionsListSkeleton /> : children}</div>
        <AddCategoryInput
          onClose={() => {
            setShowAddCategoryInput(false);
          }}
          show={showAddCategoryInput}
        />
        <button
          className="mt-1 flex w-full cursor-pointer items-center rounded-lg px-2 py-[6px] text-start outline-hidden hover:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-200 focus-visible:ring-inset"
          id="add-category-button"
          onClick={() => {
            setShowAddCategoryInput(true);
          }}
          type="button"
        >
          <figure className="text-gray-500">
            <AddCategoryIcon />
          </figure>
          <p className="ml-2 flex-1 truncate text-sm leading-[16px] font-450 text-gray-600">
            Add Collection
          </p>
        </button>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

function CollectionsHeaderOptionsPopover({
  onAddCollectionClick,
}: CollectionsListSectionHeaderProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Collection options"
        className="invisible text-gray-500 outline-hidden group-hover:visible focus-visible:ring-1 focus-visible:ring-gray-200 data-popup-open:visible"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <OptionsIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start">
          <Menu.Popup className="leading-[20px]">
            <Menu.Item
              onClick={(event) => {
                event.stopPropagation();
                onAddCollectionClick();
              }}
            >
              Add Collection
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

interface AddCategoryInputProps {
  onClose: () => void;
  show: boolean;
}

function AddCategoryInput({ onClose, show }: AddCategoryInputProps) {
  const { userProfileData } = useFetchUserProfile();
  const { addCategoryOptimisticMutation } = useAddCategoryOptimisticMutation();

  const handleAddNewCategory = (newCategoryName: string) => {
    const result = tagCategoryNameSchema.safeParse(newCategoryName);

    if (!result.success) {
      handleClientError(
        new Error(result.error.issues[0]?.message ?? "Invalid collection name"),
        `Collection name must be between ${MIN_TAG_COLLECTION_NAME_LENGTH} and ${MAX_TAG_COLLECTION_NAME_LENGTH} characters`,
      );
      return;
    }

    if (userProfileData && !isNull(userProfileData.data)) {
      addCategoryOptimisticMutation.mutate(
        {
          category_order: (userProfileData.data[0]?.category_order ?? []).filter(
            (id): id is number => id !== null,
          ),
          name: result.data,
        },
        {
          onSuccess: (data) => {
            void router.push(`/${data[0].category_slug}`);
          },
        },
      );
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div className="mt-1 flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 px-2 py-[6px] focus-within:ring-1 focus-within:ring-gray-200 focus-within:ring-inset">
      <div className="flex items-center">
        <figure className="mr-2 h-[18px] w-[18px]">
          <svg fill="var(--color-plain-reverse)" height="16" viewBox="0 0 18 18" width="16">
            <use href="/sprite.svg#star-04" />
          </svg>
        </figure>
        <input
          aria-label="New collection name"
          autoFocus
          className="bg-black/[0.004]! text-sm! leading-4! font-450! text-plain-reverse! opacity-40! outline-hidden! placeholder:text-plain-reverse"
          id="add-category-input"
          onBlur={(event) => {
            const inputValue = (event.target as HTMLInputElement)?.value;
            if (inputValue) {
              handleAddNewCategory(inputValue);
            }

            onClose();
          }}
          onKeyUp={(event) => {
            if (event.key === "Enter") {
              const inputValue = (event.target as HTMLInputElement)?.value;

              if (inputValue) {
                handleAddNewCategory(inputValue);
              }

              onClose();
            }
          }}
          placeholder="Collection Name"
        />
      </div>
    </div>
  );
}
