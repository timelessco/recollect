import { ChevronDoubleLeftIcon } from "@heroicons/react/solid";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Image from "next/image";

import { signOut } from "../../../async/supabaseCrudHelpers";
import {
  AriaDropdown,
  AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import Button from "../../../components/atoms/button";
import DownArrowGray from "../../../icons/downArrowGray";
import { useMiscellaneousStore } from "../../../store/componentStore";
import {
  dropdownMenuClassName,
  dropdownMenuItemClassName,
} from "../../../utils/commonClassNames";

const SidePaneUserDropdown = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const setShowSidePane = useMiscellaneousStore(state => state.setShowSidePane);

  const userData = session?.user?.user_metadata;

  return (
    <div className="flex justify-between">
      <AriaDropdown
        menuButton={
          <div className="flex w-full items-center justify-between rounded-lg px-1 py-[3px] hover:bg-custom-gray-9">
            <div className="flex w-4/5 items-center space-x-2">
              {session && userData?.avatar_url ? (
                <Image
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full"
                  src={userData?.avatar_url as string}
                  alt=""
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-slate-200" />
              )}
              <p className="flex-1 overflow-hidden truncate text-left text-sm font-medium leading-4 text-custom-gray-1">
                {userData?.name || session?.user?.email}
              </p>
            </div>
            <figure className="mr-3">
              <DownArrowGray />
            </figure>
          </div>
        }
        menuClassName={dropdownMenuClassName}
        menuButtonClassName="w-[86%]"
      >
        {[{ label: "Sign Out", value: "sign-out" }]?.map(item => (
          <AriaDropdownMenu key={item?.value} onClick={() => signOut(supabase)}>
            <div className={dropdownMenuItemClassName}>{item?.label}</div>
          </AriaDropdownMenu>
        ))}
      </AriaDropdown>
      <Button onClick={() => setShowSidePane(false)}>
        <figure>
          <ChevronDoubleLeftIcon className="h-4 w-4 shrink-0 text-gray-400" />
        </figure>
      </Button>
    </div>
  );
};

export default SidePaneUserDropdown;