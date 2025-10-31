import { useState } from "react";
import classNames from "classnames";

import { tweetType } from "../utils/constants";

type ReadMoreTypes = {
	children: string;
	className?: string;
	// tells if read more functionality needs to be there
	enable?: boolean;
	ogImage?: string;
	type?: string;
};

const ReadMore = ({
	className = "",
	children,
	enable = true,
	ogImage,
	type,
}: ReadMoreTypes) => {
	const [more, setMore] = useState(false);

	const wrapperClassNames = classNames(className, "overflow-hidden break-all", {
		"line-clamp-3": !more && !(type === tweetType && !ogImage),
		"line-clamp-10": more && type === tweetType && !ogImage,
	});

	return (
		<>
			<p className={wrapperClassNames}>{children}</p>
			{enable && children?.length > 300 && (
				<button
					className="relative cursor-pointer text-sm text-blue-500 duration-200 ease-in-out hover:text-blue-700"
					onClick={() => setMore(!more)}
					onPointerDown={(event) => {
						event.stopPropagation();
					}}
					type="button"
				>
					{more ? "Read less" : "Read more"}
				</button>
			)}
		</>
	);
};

export default ReadMore;
