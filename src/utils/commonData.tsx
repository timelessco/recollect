import CardIcon from "../icons/categoryIcons/cardIcon";
import CodeIcon from "../icons/categoryIcons/codeIcon";
import DesignIcon from "../icons/categoryIcons/designIcon";
import FileIcon from "../icons/categoryIcons/fileIcon";
import HomeIcon from "../icons/categoryIcons/homeIcon";
import OpenSrcIcon from "../icons/categoryIcons/openSrcIcon";
import CollectionPlaceholderIcon from "../icons/collectionPlaceholderIcon";

export const options = [
  {
    label: "home",
    icon: () => <HomeIcon />,
  },
  {
    label: "design",
    icon: () => <DesignIcon />,
  },
  {
    label: "inspiration",
    icon: () => <CollectionPlaceholderIcon />,
  },
  {
    label: "open-src",
    icon: () => <OpenSrcIcon />,
  },
  {
    label: "file",
    icon: () => <FileIcon />,
  },
  {
    label: "code",
    icon: () => <CodeIcon />,
  },
  {
    label: "card",
    icon: () => <CardIcon />,
  },
];
