import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import { useSupabaseSession } from "../../../store/componentStore";
import { type BookmarksCountTypes } from "../../../types/apiTypes";
import { optionsMenuListArray } from "../../../utils/commonData";
import {
	BOOKMARKS_COUNT_KEY,
	menuListItemName,
} from "../../../utils/constants";
import { SettingsModal } from "../modals/settings-modal";

import SingleListItemComponent from "./singleListItemComponent";

const SidePaneOptionsMenu = () => {
	const currentPath = useGetCurrentUrlPath();
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);

	const bookmarksCountData = queryClient.getQueryData([
		BOOKMARKS_COUNT_KEY,
		session?.user?.id,
	]) as {
		data: BookmarksCountTypes;
		error: PostgrestError;
	};

	const optionsMenuList = optionsMenuListArray(
		currentPath,
		bookmarksCountData,
	).filter((item) => {
		if (
			item?.name === menuListItemName.inbox ||
			item?.name === menuListItemName.everything ||
			item?.name === menuListItemName.trash ||
			item?.name === menuListItemName.settings ||
			item?.name === menuListItemName.discover
		) {
			return item;
		} else {
			return null;
		}
	});

	return (
		<div className="flex flex-col gap-px pt-[10px]">
			{optionsMenuList?.map((item) =>
				item?.id === 4 ? (
					<SettingsModal key={item.id}>
						<SingleListItemComponent
							extendedClassname="py-[6px]"
							isLink={false}
							item={item}
							showIconDropdown={false}
						/>
					</SettingsModal>
				) : (
					<SingleListItemComponent
						extendedClassname="py-[6px]"
						isLink={item?.id !== 4}
						item={item}
						key={item.id}
						showIconDropdown={false}
					/>
				),
			)}
		</div>
	);
};

export default SidePaneOptionsMenu;
