import React from 'react';
import Image from 'next/image';

type AvatarProps = HTMLImageElement;

const Avatar = (props: AvatarProps) => {
  const { alt, src } = props;
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="rounded-full"
    />
  );
};

Avatar.propTypes = {};

export default Avatar;