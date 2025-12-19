import classNames from "classnames";

import { type CategoriesData } from "../../types/apiTypes";
import { CollectionIcon } from "../collectionIcon";

type CategoryBadgesProps = {
	categories: CategoriesData[] | undefined;
	maxVisible?: number;
	className?: string;
};

export function CategoryBadges({
	categories,
	maxVisible = 2,
	className,
}: CategoryBadgesProps) {
	if (!categories?.length) {
		return null;
	}

	const visible = categories.slice(0, maxVisible);
	const overflow = categories.length - maxVisible;

	return (
		<div className={classNames("flex items-center gap-1", className)}>
			{visible.map((cat) => (
				<div key={cat.id} className="flex items-center gap-1">
					<CollectionIcon bookmarkCategoryData={cat} />
					<span className="text-13 font-450 text-gray-600">
						{cat.category_name}
					</span>
				</div>
			))}
			{overflow > 0 && (
				<span className="text-13 font-450 text-gray-500">+{overflow} more</span>
			)}
		</div>
	);
}
