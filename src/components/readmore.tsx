import { useState } from "react";
import classNames from "classnames";

type ReadMoreTypes = {
	children: string;
	className?: string;
	// tells if read more functionality needs to be there
	enable?: boolean;
};

const ReadMore = ({
	className = "",
	children,
	enable = true,
}: ReadMoreTypes) => {
	const [more, setMore] = useState(false);

	const wrapperClassNames = classNames({
		[className]: className,
		"line-clamp-3 overflow-hidden break-all": !more,
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
