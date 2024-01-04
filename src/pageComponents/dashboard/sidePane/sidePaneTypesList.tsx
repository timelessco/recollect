import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import { type BookmarksCountTypes } from "../../../types/apiTypes";
import { optionsMenuListArray } from "../../../utils/commonData";
import {
	BOOKMARKS_COUNT_KEY,
	menuListItemName,
} from "../../../utils/constants";

import SingleListItemComponent from "./singleListItemComponent";

const SidePaneTypesList = () => {
	const currentPath = useGetCurrentUrlPath();
	const session = useSession();

	const queryClient = useQueryClient();
	const bookmarksCountData = queryClient.getQueryData([
		BOOKMARKS_COUNT_KEY,
		session?.user?.id,
	]) as {
		data: BookmarksCountTypes;
		error: PostgrestError;
	};

	const optionsMenuList = optionsMenuListArray(currentPath, bookmarksCountData)
		.filter((item) => {
			if (
				item.name === menuListItemName.links ||
				item.name === menuListItemName.image ||
				item.name === menuListItemName.videos ||
				item.name === menuListItemName.documents
			) {
				return item;
			} else return null;
		})
		.map((item, index) => ({
			...item,
			id: index,
		}));

	return (
		<div className="pt-4">
			<div className="flex items-center justify-between px-1 py-[7.5px]">
				<p className="text-[13px] font-medium leading-[15px]  text-custom-gray-10">
					Types
				</p>
			</div>
			<div>
				{optionsMenuList?.map((item) => (
					<SingleListItemComponent
						extendedClassname="py-[6px]"
						item={item}
						key={item.id}
						showIconDropdown={false}
					/>
				))}
			</div>
		</div>
	);
};

export default SidePaneTypesList;
