import { useCallback } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import {
	useModalStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { type BookmarksCountTypes } from "../../../types/apiTypes";
import { optionsMenuListArray } from "../../../utils/commonData";
import {
	BOOKMARKS_COUNT_KEY,
	menuListItemName,
} from "../../../utils/constants";

import SingleListItemComponent from "./singleListItemComponent";

const SidePaneOptionsMenu = () => {
	const currentPath = useGetCurrentUrlPath();
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const SingleListItem = useCallback(SingleListItemComponent, []);

	const bookmarksCountData = queryClient.getQueryData([
		BOOKMARKS_COUNT_KEY,
		session?.user?.id,
	]) as {
		data: BookmarksCountTypes;
		error: PostgrestError;
	};

	const toggleShowSettingsModal = useModalStore(
		(state) => state.toggleShowSettingsModal,
	);

	const optionsMenuList = optionsMenuListArray(
		currentPath,
		bookmarksCountData,
	).filter((item) => {
		if (
			item?.name === menuListItemName.inbox ||
			item?.name === menuListItemName.allBookmarks ||
			item?.name === menuListItemName.trash ||
			item?.name === menuListItemName.settings
		) {
			return item;
		} else return null;
	});

	return (
		<div className="pt-[10px]">
			{optionsMenuList?.map((item) => (
				<SingleListItem
					extendedClassname="py-[7px]"
					isLink={item?.id !== 3}
					item={item}
					key={item.id}
					onClick={() => {
						if (item?.id === 3) {
							// we clicked on settings
							toggleShowSettingsModal();
						}
					}}
					showIconDropdown={false}
				/>
			))}
		</div>
	);
};

export default SidePaneOptionsMenu;
