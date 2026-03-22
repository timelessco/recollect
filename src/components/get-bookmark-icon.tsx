import Image from "next/image";

import type { SingleListData } from "../types/apiTypes";

import { AudioIcon } from "@/icons/audio-icon";
import { GlobeLinkIcon } from "@/icons/globe-link-icon";

import FolderIcon from "../icons/folderIcon";
import ImageIcon from "../icons/imageIcon";
import VideoIcon from "../icons/videoIcon";
import { IMAGE_TYPE_PREFIX, PDF_MIME_TYPE, VIDEO_TYPE_PREFIX } from "../utils/constants";
import {
  isBookmarkAudio,
  isBookmarkDocument,
  isBookmarkImage,
  isBookmarkVideo,
} from "../utils/helpers";

export interface GetBookmarkIconProps {
  /**
   * Array of bookmark IDs that have favicon errors
   */
  favIconErrorIds?: number[];
  /**
   * Whether the user is in the tweets page (for Twitter avatar display)
   */
  isUserInTweetsPage?: boolean;
  /**
   * The bookmark item to determine the icon for
   */
  item: SingleListData;
  /**
   * Callback when favicon image fails to load
   */
  onFavIconError?: (bookmarkId: number) => void;
  /**
   * Size of the icon (default: 15)
   */
  size?: number;
}

/**
 * Determines and returns the appropriate icon component for a bookmark
 * based on its type, metadata, and context.
 *
 * Priority order:
 * 1. Favicon error fallback -> LinkIcon
 * 2. Twitter avatar (if in tweets page) -> Image
 * 3. Favicon -> Image
 * 4. Video -> VideoIcon
 * 5. Document -> FolderIcon
 * 6. Image -> ImageIcon
 * 7. Default -> LinkIcon
 */
export const GetBookmarkIcon = ({
  favIconErrorIds = [],
  isUserInTweetsPage = false,
  item,
  onFavIconError,
  size = 15,
}: GetBookmarkIconProps) => {
  /* oxlint-disable prefer-nullish-coalescing -- boolean OR: false should fall through to backup check */
  const isVideo =
    item?.meta_data?.mediaType?.startsWith(VIDEO_TYPE_PREFIX) || isBookmarkVideo(item?.type);
  const isDocument = item?.meta_data?.mediaType === PDF_MIME_TYPE || isBookmarkDocument(item?.type);
  const isImage =
    item?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) || isBookmarkImage(item?.type);
  /* oxlint-enable prefer-nullish-coalescing */
  const isAudio = isBookmarkAudio(item?.type) || item?.meta_data?.mediaType?.startsWith("audio");
  // Favicon error fallback
  if (favIconErrorIds.includes(item.id)) {
    return <GlobeLinkIcon className="text-gray-1000" />;
  }

  // Twitter avatar (if in tweets page)
  if (isUserInTweetsPage && item.meta_data?.twitter_avatar_url) {
    return (
      <Image
        alt={item.title ? `${item.title} favicon` : "Bookmark favicon"}
        className="h-[15px] w-[15px] rounded-sm"
        height={size}
        onError={() => {
          onFavIconError?.(item.id);
        }}
        src={item.meta_data.twitter_avatar_url}
        width={size}
      />
    );
  }

  // Favicon
  if (item?.meta_data?.favIcon) {
    return (
      <Image
        alt={item.title ? `${item.title} favicon` : "Bookmark favicon"}
        className="h-[15px] w-[15px] rounded-sm"
        height={size}
        onError={() => {
          onFavIconError?.(item.id);
        }}
        src={item.meta_data.favIcon}
        width={size}
      />
    );
  }

  // Video
  if (isVideo) {
    return <VideoIcon size={`${size}`} />;
  }

  // Document
  if (isDocument) {
    return <FolderIcon size={`${size}`} />;
  }

  // Image
  if (isImage) {
    return <ImageIcon size={`${size}`} />;
  }

  if (isAudio) {
    return <AudioIcon className={`h-[${size}px] w-[${size}px]`} />;
  }

  // Default fallback
  return <GlobeLinkIcon className={`h-[${size}px] w-[${size}px]`} />;
};
