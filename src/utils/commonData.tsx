import CardIcon from '../icons/categoryIcons/cardIcon';
import FileIcon from '../icons/categoryIcons/fileIcon';
import HomeIcon from '../icons/categoryIcons/homeIcon';
import OpenSrcIcon from '../icons/categoryIcons/openSrcIcon';
import CollectionPlaceholderIcon from '../icons/collectionPlaceholderIcon';
import DesignIcon from '../icons/categoryIcons/designIcon';
import CodeIcon from '../icons/categoryIcons/codeIcon';

export const options = [
  {
    label: 'home',
    icon: () => <HomeIcon />,
  },
  {
    label: 'design',
    icon: () => <DesignIcon />,
  },
  {
    label: 'inspiration',
    icon: () => <CollectionPlaceholderIcon />,
  },
  {
    label: 'open-src',
    icon: () => <OpenSrcIcon />,
  },
  {
    label: 'file',
    icon: () => <FileIcon />,
  },
  {
    label: 'code',
    icon: () => <CodeIcon />,
  },
  {
    label: 'card',
    icon: () => <CardIcon />,
  },
];
