import React from "react";
import PropTypes from "prop-types";
import Image from "next/image";

interface AvatarProps extends HTMLImageElement {}

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
