import type { CategoriesData } from "../../types/apiTypes";

import { CollectionIcon } from "../collectionIcon";

interface CategoryBadgesProps {
  categories: CategoriesData[] | undefined;
  maxVisible?: number;
}

export function CategoryBadges({ categories, maxVisible = 2 }: CategoryBadgesProps) {
  if (!categories?.length) {
    return null;
  }

  const visible = categories.slice(0, maxVisible);
  const overflow = categories.length - maxVisible;

  return (
    <>
      {visible.map((cat) => (
        <div
          className="mr-1 flex items-center gap-1 text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-600"
          key={cat.id}
        >
          <CollectionIcon bookmarkCategoryData={cat} />
          <span>{cat.category_name}</span>
        </div>
      ))}
      {overflow > 0 && (
        <span className="text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-500">
          +{overflow} more
        </span>
      )}
    </>
  );
}
