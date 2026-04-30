import { useRouter } from "next/router";

import isNull from "lodash/isNull";

import useFetchUserProfile from "@/async/queryHooks/user/use-fetch-user-profile";
import { Menu } from "@/components/ui/recollect/menu";
import { AppleIcon } from "@/icons/apple-icon";
import { ChromeIcon } from "@/icons/chrome-icon";
// import { PlayStoreIcon } from "@/icons/play-store-icon";
import { SignOutIcon } from "@/icons/sign-out-icon";

import { signOut } from "../../../async/supabaseCrudHelpers";
import UserAvatar from "../../../components/userAvatar";
import DownArrowGray from "../../../icons/downArrowGray";
import { useSupabaseSession } from "../../../store/componentStore";
import { LOGIN_URL } from "../../../utils/constants";
import { createClient } from "../../../utils/supabaseClient";

const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/recollect-%E2%80%94-save-anything/hghngcbiflcoekclkkealmlbginmloef";
const IOS_APP_URL = "https://testflight.apple.com/join/nqxpye48";
// const ANDROID_APP_URL = "#";

const itemClassName =
  "flex h-[26px] cursor-pointer items-center gap-[6px] overflow-clip rounded-lg px-2 py-[5.5px] text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-800 no-underline outline-hidden data-highlighted:bg-gray-200 data-highlighted:text-gray-900";

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
            <Menu.Popup className="w-[203px] p-[6px]" style={{ fontFeatureSettings: "'case'" }}>
              <Menu.Item
                className={itemClassName}
                render={
                  <a href={CHROME_EXTENSION_URL} rel="noopener noreferrer" target="_blank">
                    <ChromeIcon className="size-4" />
                    Download Extension
                  </a>
                }
              />
              <Menu.Item
                className={itemClassName}
                render={
                  <a href={IOS_APP_URL} rel="noopener noreferrer" target="_blank">
                    <AppleIcon className="size-4" />
                    Download iOS & iPadOS
                  </a>
                }
              />
              {/* <Menu.Item
                className={itemClassName}
                render={
                  <a href={ANDROID_APP_URL} rel="noopener noreferrer" target="_blank">
                    <PlayStoreIcon className="size-4" />
                    Download Android
                  </a>
                }
              /> */}
              <Menu.Item
                className={itemClassName}
                onClick={() => {
                  void handleSignOut();
                }}
              >
                <SignOutIcon className="size-4" />
                Sign out
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
