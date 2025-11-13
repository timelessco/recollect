import React from "react";
import Image from "next/image";

type AvatarProps = HTMLImageElement;

const Avatar = (props: AvatarProps) => {
	const { alt, src } = props;
	return (
		<Image
			alt={alt}
			className="rounded-full"
			height={40}
			src={src}
			width={40}
		/>
	);
};

export default Avatar;
