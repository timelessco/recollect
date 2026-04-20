import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";

import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";

import { Button } from "@/components/ui/recollect/button";
import { Popover } from "@/components/ui/recollect/popover";
import { useAddBookmark } from "@/hooks/useAddBookmark";
import { useFileUploadDrop } from "@/hooks/useFileUploadDrop";
import { AddBookmarkInputIcon } from "@/icons/miscellaneousIcons/add-bookmark-input-icon";
import { PlusIcon } from "@/icons/plus-icon";
import { emitClientEvent } from "@/lib/api-helpers/axiom-client-events";
import { grayInputClassName } from "@/utils/commonClassNames";
import { URL_PATTERN } from "@/utils/constants";

import Input from "../atoms/input";

const AddBookmarkDropdown = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        emitClientEvent("bookmark_add_click", { source: "cmdk" });
        setOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
    };
  }, []);

  return (
    <Popover.Root onOpenChange={setOpen} open={open}>
      <Popover.Trigger
        className="flex items-center rounded-full bg-gray-950 p-[7px] text-white outline-hidden filter-[drop-shadow(0_3px_6px_rgba(0,0,0,0.07))_drop-shadow(0_11px_11px_rgba(0,0,0,0.06))] hover:bg-gray-800"
        onClick={() => {
          emitClientEvent("bookmark_add_click", { source: "toolbar" });
        }}
        title="create"
      >
        <PlusIcon className="size-4 text-gray-0" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="end">
          <Popover.Popup className="w-auto p-0 leading-5">
            <AddBookmarkPopupContent
              onClose={() => {
                setOpen(false);
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};

interface AddBookmarkPopupContentProps {
  onClose: () => void;
}

const AddBookmarkPopupContent = ({ onClose }: AddBookmarkPopupContentProps) => {
  const { onAddBookmark } = useAddBookmark();
  const { onDrop } = useFileUploadDrop();

  const {
    clearErrors,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<{ url: string }>();

  const onSubmit: SubmitHandler<{ url: string }> = useCallback(
    (data) => {
      onAddBookmark(data.url);
      reset({ url: "" });
      onClose();
    },
    [onAddBookmark, onClose, reset],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  const { ref, ...rest } = register("url", {
    onChange: () => {
      if (!isEmpty(errors)) {
        clearErrors();
      }
    },
    pattern: URL_PATTERN,
    required: true,
  });

  return (
    <div className="relative w-[326px] p-1">
      <input
        className="hidden"
        onChange={(event) => {
          if (!isNil(event.target.files)) {
            onDrop([...event.target.files]);
          }
        }}
        ref={fileUploadInputRef}
        type="file"
      />
      <Button
        aria-label="Upload file"
        className="absolute top-[11px] left-[14px] z-1 flex h-4 w-4 items-center justify-center p-0 text-gray-600 hover:text-gray-900"
        onClick={() => {
          if (fileUploadInputRef.current) {
            fileUploadInputRef.current.click();
          }
        }}
      >
        <AddBookmarkInputIcon className="h-4 w-4" />
      </Button>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(onSubmit)();
        }}
      >
        <Input
          autoFocus
          className={`${grayInputClassName} rounded-[11px] pl-[32px]`}
          errorClassName="ml-2"
          {...rest}
          errorText="Enter valid URL"
          isError={!isEmpty(errors)}
          placeholder="Add a link or drop a file anywhere"
          ref={(event) => {
            ref(event);
            inputRef.current = event;
          }}
        />
      </form>
    </div>
  );
};

export default AddBookmarkDropdown;
