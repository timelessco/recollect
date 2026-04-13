import type { CollabDataInCategory } from "../../../types/apiTypes";

import useDeleteSharedCategoriesUserMutation from "../../../async/mutationHooks/share/use-delete-shared-categories-user-mutation";
import useUpdateSharedCategoriesUserAccessMutation from "../../../async/mutationHooks/share/use-update-shared-categories-user-access-mutation";
import { Select } from "../../../components/ui/recollect/select";
import DownArrowGray from "../../../icons/downArrowGray";
import { errorToast, successToast } from "../../../utils/toastMessages";

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

interface AccessRoleSelectProps {
  isLoggedinUserTheOwner: boolean;
  item: CollabDataInCategory;
}

export const AccessRoleSelect = ({ isLoggedinUserTheOwner, item }: AccessRoleSelectProps) => {
  const { updateSharedCategoriesUserAccessMutation } =
    useUpdateSharedCategoriesUserAccessMutation();
  const { deleteSharedCategoriesUserMutation } = useDeleteSharedCategoriesUserMutation();

  if (!isLoggedinUserTheOwner) {
    return <div className={rightTextStyles}>{item.edit_access ? "Editor" : "Viewer"}</div>;
  }

  return (
    <Select.Root
      onValueChange={(value) => {
        if (value !== "No Access") {
          const updateRole = async () => {
            try {
              await updateSharedCategoriesUserAccessMutation.mutateAsync({
                id: item.share_id!,
                updateData: {
                  edit_access: value === "Editor",
                },
              });
              successToast("User role changed");
            } catch {
              errorToast("Failed to update role");
            }
          };

          void updateRole();
        } else {
          const removeAccess = async () => {
            try {
              await deleteSharedCategoriesUserMutation.mutateAsync({
                id: item.share_id!,
              });
            } catch {
              errorToast("Failed to remove access");
            }
          };

          void removeAccess();
        }
      }}
      value={item.edit_access ? "Editor" : "Viewer"}
    >
      <Select.Trigger className="gap-2">
        <Select.Value placeholder="Select role" />
        <Select.Icon>
          <DownArrowGray />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-103" sideOffset={2}>
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

interface InviteRoleSelectProps {
  disabled: boolean;
  onChange: (value: boolean) => void;
  value: boolean;
}

export const InviteRoleSelect = ({ disabled, onChange, value }: InviteRoleSelectProps) => (
  <Select.Root
    disabled={disabled}
    onValueChange={(selectedValue) => {
      onChange(selectedValue === "Editor");
    }}
    value={value ? "Editor" : "Viewer"}
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
                className="py-[5px] leading-[15px] font-medium tracking-[0.13px]"
                key={option.value}
                value={option.value}
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
