import ArticleIcon from "../../../icons/articleIcon";
import FolderIcon from "../../../icons/folderIcon";
import ImageIcon from "../../../icons/imageIcon";
import VideoIcon from "../../../icons/videoIcon";
import { ALL_BOOKMARKS_URL } from "../../../utils/constants";

import SingleListItemComponent from "./singleListItemComponent";

const SidePaneTypesList = () => {
  const optionsMenuList = [
    {
      icon: <ArticleIcon />,
      name: "Articles",
      href: `/${ALL_BOOKMARKS_URL}`,
      current: false,
      id: 0,
      count: undefined,
    },
    {
      icon: <ImageIcon />,
      name: "Image",
      href: `/${ALL_BOOKMARKS_URL}`,
      current: false,
      id: 1,
      count: undefined,
    },
    {
      icon: <VideoIcon />,
      name: "Videos",
      href: `/${ALL_BOOKMARKS_URL}`,
      current: false,
      id: 2,
      count: undefined,
    },
    {
      icon: <FolderIcon />,
      name: "Documents",
      href: `/${ALL_BOOKMARKS_URL}`,
      current: false,
      id: 3,
      count: undefined,
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
        {optionsMenuList?.map(item => {
          return (
            <SingleListItemComponent
              extendedClassname="py-[6px]"
              key={item.id}
              item={item}
              showIconDropdown={false}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SidePaneTypesList;
