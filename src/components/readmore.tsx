import { useState } from "react";

import { cn } from "@/utils/tailwind-merge";

interface ReadMoreTypes {
  children: string;
  className?: string;
  // tells if read more functionality needs to be there
  enable?: boolean;
}

const ReadMore = ({ children, className = "", enable = true }: ReadMoreTypes) => {
  const [more, setMore] = useState(false);

  const wrapperClassNames = cn({
    [className]: className,
    "line-clamp-3 overflow-hidden break-all": !more,
  });

  return (
    <>
      <p className={wrapperClassNames}>{children}</p>
      {enable && children?.length > 300 && (
        <button
          className="relative cursor-pointer text-sm text-blue-500 duration-200 ease-in-out hover:text-blue-700"
          onClick={() => {
            setMore(!more);
          }}
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
