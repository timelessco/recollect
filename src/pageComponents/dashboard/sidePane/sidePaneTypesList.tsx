import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import AriaDisclosure from "../../../components/ariaDisclosure";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import DownArrowGray from "../../../icons/downArrowGray";
import { useSupabaseSession } from "../../../store/componentStore";
import { type BookmarksCountTypes } from "../../../types/apiTypes";
import { optionsMenuListArray } from "../../../utils/commonData";
import {
	BOOKMARKS_COUNT_KEY,
	menuListItemName,
} from "../../../utils/constants";

import SingleListItemComponent from "./singleListItemComponent";

const SidePaneTypesList = () => {
	const currentPath = useGetCurrentUrlPath();
	const session = useSupabaseSession((state) => state.session);

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
				item.name === menuListItemName.documents ||
				item.name === menuListItemName.tweets
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
			<AriaDisclosure
				renderDisclosureButton={
					<div className="group flex items-center px-1 py-[7.5px] text-[13px] font-medium leading-[15px]  text-gray-600">
						<p className="mr-1">Types</p>
						<DownArrowGray
							className="collections-sidepane-down-arrow hidden group-hover:block"
							fill="currentColor"
							size={10}
						/>
					</div>
				}
			>
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
			</AriaDisclosure>
		</div>
	);
};

export default SidePaneTypesList;
