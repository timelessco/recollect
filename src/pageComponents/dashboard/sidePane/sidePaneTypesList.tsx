import { useQueryClient } from "@tanstack/react-query";

import type { BookmarksCountTypes } from "../../../types/apiTypes";

import { Collapsible } from "@/components/ui/recollect/collapsible";

import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import DownArrowGray from "../../../icons/downArrowGray";
import { useSupabaseSession } from "../../../store/componentStore";
import { optionsMenuListArray } from "../../../utils/commonData";
import { BOOKMARKS_COUNT_KEY, menuListItemName } from "../../../utils/constants";
import SingleListItemComponent from "./singleListItemComponent";

const SidePaneTypesList = () => {
  const currentPath = useGetCurrentUrlPath();
  const session = useSupabaseSession((state) => state.session);

  const queryClient = useQueryClient();
  const bookmarksCountData = queryClient.getQueryData<BookmarksCountTypes>([
    BOOKMARKS_COUNT_KEY,
    session?.user?.id,
  ]);

  const optionsMenuList = optionsMenuListArray(currentPath, bookmarksCountData).filter((item) =>
    [
      menuListItemName.audio,
      menuListItemName.documents,
      menuListItemName.image,
      menuListItemName.instagram,
      menuListItemName.links,
      menuListItemName.tweets,
      menuListItemName.videos,
    ].includes(item.name),
  );

  return (
    <div className="pt-3">
      <Collapsible.Root>
        <Collapsible.Trigger>
          <div className="group flex items-center px-1 py-[7.5px] text-13 leading-[15px] font-medium tracking-[0.01em] text-gray-600">
            <p className="mr-1">Types</p>
            <DownArrowGray
              className="collections-sidepane-down-arrow mt-px hidden group-hover:block"
              size={10}
            />
          </div>
        </Collapsible.Trigger>
        <Collapsible.Panel>
          <div className="flex flex-col gap-px">
            {optionsMenuList?.map((item) => (
              <SingleListItemComponent
                extendedClassname="py-[6px]"
                item={item}
                key={item.id}
                showIconDropdown={false}
              />
            ))}
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
};

export default SidePaneTypesList;
