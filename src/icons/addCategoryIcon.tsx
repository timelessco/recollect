import React from "react";

import { Icon } from "../components/atoms/icon";

const AddCategoryIcon = () => (
	<div className="h-[18px] w-[18px]">
		<Icon
			fill="none"
			height="100%"
			viewBox="0 0 20 20"
			width="100%"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect fill="var(--color-gray-500)" height="100%" rx="10" width="100%" />
			<path
				clipRule="evenodd"
				d="M10.6501 6C10.6501 5.64101 10.3591 5.35 10.0001 5.35C9.64111 5.35 9.3501 5.64101 9.3501 6V9.35H6.0001C5.64111 9.35 5.3501 9.64101 5.3501 10C5.3501 10.359 5.64111 10.65 6.0001 10.65H9.3501V14C9.3501 14.359 9.64111 14.65 10.0001 14.65C10.3591 14.65 10.6501 14.359 10.6501 14V10.65H14.0001C14.3591 10.65 14.6501 10.359 14.6501 10C14.6501 9.64101 14.3591 9.35 14.0001 9.35H10.6501V6Z"
				fill="white"
				fillRule="evenodd"
			/>
		</Icon>
	</div>
);

export default AddCategoryIcon;
