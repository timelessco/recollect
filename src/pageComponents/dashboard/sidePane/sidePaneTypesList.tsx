import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import ArticleIcon from "../../../icons/articleIcon";
import FolderIcon from "../../../icons/folderIcon";
import ImageIcon from "../../../icons/imageIcon";
import VideoIcon from "../../../icons/videoIcon";
import { type BookmarksCountTypes } from "../../../types/apiTypes";
import {
	ALL_BOOKMARKS_URL,
	BOOKMARKS_COUNT_KEY,
	IMAGES_URL,
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

	const optionsMenuList = [
		{
			icon: <ArticleIcon />,
			name: "Articles",
			href: `/${ALL_BOOKMARKS_URL}`,
			current: false,
			id: 0,
			count: undefined,
			iconColor: "",
		},
		{
			icon: <ImageIcon />,
			name: "Image",
			href: `/${IMAGES_URL}`,
			current: currentPath === IMAGES_URL,
			id: 1,
			count: bookmarksCountData?.data?.images,
			iconColor: "",
		},
		{
			icon: <VideoIcon />,
			name: "Videos",
			href: `/${ALL_BOOKMARKS_URL}`,
			current: false,
			id: 2,
			count: undefined,
			iconColor: "",
		},
		{
			icon: <FolderIcon />,
			name: "Documents",
			href: `/${ALL_BOOKMARKS_URL}`,
			current: false,
			id: 3,
			count: undefined,
			iconColor: "",
		},
	];

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
