import Image from "next/image";
import { isEmpty, isNil } from "lodash";

import DefaultUserIcon from "../icons/user/defaultUserIcon";
import { defaultBlur } from "../utils/constants";

type UserAvatarTypes = {
	alt: string;
	className: string;
	height: number;
	src: string;
	width: number;
};

const UserAvatar = (props: UserAvatarTypes) => {
	const { alt, src, className, width, height } = props;

	if (!isNil(src) && !isEmpty(src)) {
		return (
			<Image
				alt={alt}
				blurDataURL={defaultBlur}
				className={className}
				height={height}
				src={src}
				width={width}
			/>
		);
	}

	// TODO: fix this dynamic tailwind classname
	return <DefaultUserIcon className={`h-[${height}px] w-[${width}px]`} />;
};

export default UserAvatar;
