import { useRouter } from "next/router";

import isNull from "lodash/isNull";

import useFetchUserProfile from "@/async/queryHooks/user/use-fetch-user-profile";
import { Menu } from "@/components/ui/recollect/menu";

import { signOut } from "../../../async/supabaseCrudHelpers";
import UserAvatar from "../../../components/userAvatar";
import DownArrowGray from "../../../icons/downArrowGray";
import { useSupabaseSession } from "../../../store/componentStore";
import { LOGIN_URL } from "../../../utils/constants";
import { createClient } from "../../../utils/supabaseClient";

const SidePaneUserDropdown = () => {
  const setSession = useSupabaseSession((state) => state.setSession);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await signOut(supabase);
    // @ts-expect-error -- clearing session on sign-out with empty object
    setSession({});
    void router.push(`/${LOGIN_URL}`);
  };

  return (
    <div className="flex justify-between">
      <Menu.Root>
        <Menu.Trigger
          className="text-text-color w-full rounded-lg px-1.5 py-[3px] text-gray-800 outline-hidden hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-1 focus-visible:ring-gray-200 data-popup-open:rounded-lg data-popup-open:bg-gray-100 data-popup-open:text-gray-900"
          title="User menu"
        >
          <div className="flex w-full items-center justify-between">
            <SidePaneUserTrigger />
            <span aria-hidden="true" className="mt-px">
              <DownArrowGray />
            </span>
          </div>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start">
            <Menu.Popup className="leading-[20px]">
              <Menu.Item
                onClick={() => {
                  void handleSignOut();
                }}
              >
                Sign Out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
};

const SidePaneUserTrigger = () => {
  const { isLoading, userProfileData } = useFetchUserProfile();
  const userData = userProfileData?.[0];

  return (
    <div className="-ml-0.25 flex w-4/5 items-center space-x-2">
      <UserAvatar
        alt="user-avatar"
        className="h-6 w-6 rounded-full bg-gray-1000 object-contain"
        height={24}
        src={!isNull(userData?.profile_pic) ? (userData?.profile_pic ?? "") : ""}
        width={24}
      />
      <p className="flex-1 truncate overflow-hidden text-left text-sm leading-4 font-medium text-gray-800">
        {isLoading
          ? "Loading..."
          : (userData?.display_name ?? userData?.user_name ?? userData?.email)}
      </p>
    </div>
  );
};

export default SidePaneUserDropdown;
