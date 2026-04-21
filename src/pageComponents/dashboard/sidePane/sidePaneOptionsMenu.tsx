import { useQueryClient } from "@tanstack/react-query";

import type { BookmarksCountTypes } from "../../../types/apiTypes";

import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import { bucketHref, emitClientEvent } from "../../../lib/api-helpers/axiom-client-events";
import { useSupabaseSession } from "../../../store/componentStore";
import { optionsMenuListArray } from "../../../utils/commonData";
import { BOOKMARKS_COUNT_KEY, menuListItemName } from "../../../utils/constants";
import { SettingsModalTrigger } from "../modals/settings-modal";
import SingleListItemComponent from "./singleListItemComponent";

const SidePaneOptionsMenu = () => {
  const currentPath = useGetCurrentUrlPath();
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);

  const bookmarksCountData = queryClient.getQueryData<BookmarksCountTypes>([
    BOOKMARKS_COUNT_KEY,
    session?.user?.id,
  ]);

  const optionsMenuList = optionsMenuListArray(currentPath, bookmarksCountData).filter((item) => {
    if (
      item?.name === menuListItemName.inbox ||
      item?.name === menuListItemName.everything ||
      item?.name === menuListItemName.trash ||
      item?.name === menuListItemName.settings ||
      item?.name === menuListItemName.discover
    ) {
      return item;
    }

    return null;
  });

  return (
    <div className="flex flex-col gap-px pt-[10px]">
      {optionsMenuList?.map((item) =>
        item?.id === 4 ? (
          <SettingsModalTrigger key={item.id}>
            <SingleListItemComponent
              extendedClassname="py-[6px]"
              isLink={false}
              item={item}
              showIconDropdown={false}
            />
          </SettingsModalTrigger>
        ) : (
          <SingleListItemComponent
            extendedClassname="py-[6px]"
            isLink
            item={item}
            key={item.id}
            onNavigate={() => {
              emitClientEvent("category_switch", {
                source: "sidebar_nav",
                to_bucket: bucketHref(item.href ?? ""),
              });
            }}
            showIconDropdown={false}
          />
        ),
      )}
    </div>
  );
};

export default SidePaneOptionsMenu;
