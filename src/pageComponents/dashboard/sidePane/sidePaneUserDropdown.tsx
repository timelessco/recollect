import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import {
  AriaDropdown,
  AriaDropdownMenu,
} from '../../../components/ariaDropdown';
import Image from 'next/image';
import DownArrowGray from '../../../icons/downArrowGray';
import { signOut } from '../../../async/supabaseCrudHelpers';
import { useMiscellaneousStore } from '../../../store/componentStore';
import Button from '../../../components/atoms/button';
import { ChevronDoubleLeftIcon } from '@heroicons/react/solid';
import {
  dropdownMenuClassName,
  dropdownMenuItemClassName,
} from '../../../utils/commonClassNames';

const SidePaneUserDropdown = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const setShowSidePane = useMiscellaneousStore(
    (state) => state.setShowSidePane
  );

  const userData = session?.user?.user_metadata;

  return (
    <div className="flex justify-between">
      <AriaDropdown
        menuButton={
          <div className="px-1 py-[3px] flex justify-between items-center hover:bg-custom-gray-9 rounded-lg w-full">
            <div className="flex items-center space-x-2 w-4/5">
              {session && (
                <Image
                  width={24}
                  height={24}
                  className="h-8 w-8 rounded-full"
                  src={userData?.avatar_url}
                  alt=""
                />
              )}
              <p className="text-custom-gray-1 text-left font-medium text-sm leading-4 truncate overflow-hidden flex-1">
                {userData?.name}
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
        {[{ label: 'Sign Out', value: 'sign-out' }]?.map((item) => (
          <AriaDropdownMenu key={item?.value} onClick={() => signOut(supabase)}>
            <div className={dropdownMenuItemClassName}>{item?.label}</div>
          </AriaDropdownMenu>
        ))}
      </AriaDropdown>
      <Button onClick={() => setShowSidePane(false)}>
        <figure>
          <ChevronDoubleLeftIcon className="flex-shrink-0 h-4 w-4 text-gray-400" />
        </figure>
      </Button>
    </div>
  );
};

export default SidePaneUserDropdown;
