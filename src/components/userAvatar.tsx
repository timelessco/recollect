import Image from "next/image";
import { useState } from "react";

import { isEmpty, isNil } from "lodash";

import { DefaultUserIcon } from "../icons/user/defaultUserIcon";
import { defaultBlur } from "../utils/constants";

interface UserAvatarTypes {
  alt: string;
  className: string;
  height: number;
  src: string;
  width: number;
}

const UserAvatar = (props: UserAvatarTypes) => {
  const { alt, className, height, src, width } = props;
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  if (isNil(src) || isEmpty(src)) {
    return <DefaultUserIcon className={className} />;
  }

  return (
    <span className={`relative inline-block ${className}`} style={{ height, width }}>
      {showPlaceholder && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <DefaultUserIcon className="h-full w-full" />
        </span>
      )}
      <Image
        alt={alt}
        blurDataURL={defaultBlur}
        className={className}
        height={height}
        onError={() => {
          setShowPlaceholder(true);
        }}
        onLoad={() => {
          setShowPlaceholder(false);
        }}
        src={src}
        width={width}
      />
    </span>
  );
};

export default UserAvatar;
