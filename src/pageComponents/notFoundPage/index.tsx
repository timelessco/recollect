import Link from "next/link";

import { buttonDarkClassName } from "../../utils/commonClassNames";
import { EVERYTHING_URL } from "../../utils/constants";

const NotFoundPage = () => (
	<div className="flex justify-center py-[300px]">
		<div className="flex flex-col space-y-9">
			<p className="text-3xl font-semibold text-gray-500">
				This page is not present
			</p>
			<Link
				className={buttonDarkClassName}
				href={`/${EVERYTHING_URL}`}
				passHref
				type="dark"
			>
				Go to home
			</Link>
		</div>
	</div>
);

export default NotFoundPage;
