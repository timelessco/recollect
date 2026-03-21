import { isNull } from "lodash";

import useDeleteSharedCategoriesUserMutation from "../../../async/mutationHooks/share/useDeleteSharedCategoriesUserMutation";
import useUpdateSharedCategoriesUserAccessMutation from "../../../async/mutationHooks/share/useUpdateSharedCategoriesUserAccessMutation";
import { Select } from "../../../components/ui/recollect/select";
import DownArrowGray from "../../../icons/downArrowGray";
import { type CollabDataInCategory } from "../../../types/apiTypes";
import { mutationApiCall } from "../../../utils/apiHelpers";
import { successToast } from "../../../utils/toastMessages";

const rightTextStyles = "text-13 font-medium leading-[15px] text-gray-600";

const ROLE_OPTIONS = [
  { label: "Editor", value: "Editor" },
  { label: "Viewer", value: "Viewer" },
  { label: "No Access", value: "No Access" },
] as const;

const INVITE_ROLE_OPTIONS = [
  { label: "Editor", value: "Editor" },
  { label: "Viewer", value: "Viewer" },
] as const;

type AccessRoleSelectProps = {
  item: CollabDataInCategory;
  isLoggedinUserTheOwner: boolean;
};

export const AccessRoleSelect = ({ item, isLoggedinUserTheOwner }: AccessRoleSelectProps) => {
  const { updateSharedCategoriesUserAccessMutation } =
    useUpdateSharedCategoriesUserAccessMutation();
  const { deleteSharedCategoriesUserMutation } = useDeleteSharedCategoriesUserMutation();

  if (!isLoggedinUserTheOwner) {
    return <div className={rightTextStyles}>{item.edit_access ? "Editor" : "Viewer"}</div>;
  }

  return (
    <Select.Root
      value={item.edit_access ? "Editor" : "Viewer"}
      onValueChange={async (value) => {
        if (value !== "No Access") {
          const response = (await mutationApiCall(
            updateSharedCategoriesUserAccessMutation.mutateAsync({
              id: item.share_id as number,
              updateData: {
                edit_access: Boolean(Number.parseInt(value === "Editor" ? "1" : "0", 10)),
              },
            }),
          )) as { error: Error };

          if (isNull(response?.error)) {
            successToast("User role changed");
          }
        } else {
          void mutationApiCall(
            deleteSharedCategoriesUserMutation.mutateAsync({
              id: item.share_id as number,
            }),
          );
        }
      }}
    >
      <Select.Trigger className="gap-2">
        <Select.Value placeholder="Select role" />
        <Select.Icon>
          <DownArrowGray />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={2} className="z-103">
          <Select.Popup>
            <Select.List>
              {ROLE_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
};

type InviteRoleSelectProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
};

export const InviteRoleSelect = ({ value, onChange, disabled }: InviteRoleSelectProps) => (
  <Select.Root
    value={value ? "Editor" : "Viewer"}
    onValueChange={(value) => onChange(value === "Editor")}
    disabled={disabled}
  >
    <Select.Trigger className="flex items-center rounded-[6px] px-2 py-[5.5px] text-13 leading-[15px] tracking-[0.13px] text-gray-alpha-600 hover:bg-gray-50 data-popup-open:bg-gray-50">
      <Select.Value placeholder="Viewer" />
      <Select.Icon className="ml-1">
        <DownArrowGray />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner align="start" className="z-103">
        <Select.Popup>
          <Select.List>
            {INVITE_ROLE_OPTIONS.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="py-[5px] leading-[15px] font-medium tracking-[0.13px]"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>
);
