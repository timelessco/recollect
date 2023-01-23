import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import AriaDropDown from '../../../components/ariaDropdown';
import Image from 'next/image';
import DownArrowGray from '../../../icons/downArrowGray';
import { signOut } from '../../../async/supabaseCrudHelpers';

const SidePaneUserDropdown = () => {
  const session = useSession();
  const supabase = useSupabaseClient();

  const userData = session?.user?.user_metadata;

  return (
    <AriaDropDown
      renderMenuButton={() => (
        <div className="px-1 py-[3px] flex justify-between items-center hover:bg-custom-gray-9 rounded-lg w-full">
          <div className="flex items-center space-x-2">
            {session && (
              <Image
                width={24}
                height={24}
                className="h-8 w-8 rounded-full"
                src={userData?.avatar_url}
                alt=""
              />
            )}
            <p className="text-custom-gray-1 font-medium text-sm leading-4">
              {userData?.name}
            </p>
          </div>
          <figure className="mr-3">
            <DownArrowGray />
          </figure>
        </div>
      )}
      options={[{ label: 'Sign Out', value: 'sign-out' }]}
      renderSingleMenuItem={(item) => (
        <div className=" text-custom-gray-1 font-450 text-13 leading-4 px-2 py-1 hover:bg-custom-gray-9 focus:bg-custom-gray-9 cursor-pointer rounded-lg">
          {item?.label}
        </div>
      )}
      menuClassName="bg-white rounded-xl shadow-custom-3 p-[6px] w-48"
      onOptionClick={() => signOut(supabase)}
    />
  );
};

export default SidePaneUserDropdown;
