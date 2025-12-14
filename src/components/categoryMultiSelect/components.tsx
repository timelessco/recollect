import { type ComponentProps } from "react";
import {
	Button,
	composeRenderProps,
	ListBoxItem,
	Tag,
	TagGroup,
	TagList,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { CollectionIcon } from "../collectionIcon";
import { checkboxBoxStyles } from "../ui/recollect/checkbox";

import { CheckIcon } from "@/icons/check-icon";
import { LightboxCloseIcon } from "@/icons/lightboxCloseIcon";
import { type CategoriesData } from "@/types/apiTypes";

const tagStyles = tv({
	base: "flex cursor-pointer items-center gap-1 rounded-md bg-gray-800 px-2 py-[2px] text-xs leading-[15px] font-450 tracking-[0.01em] text-white outline-none",
	variants: {
		isFocusVisible: {
			true: "ring-2 ring-blue-500 ring-offset-1",
		},
	},
});

type CategoryTagProps = {
	category: CategoriesData;
};

const CategoryTag = ({ category }: CategoryTagProps) => (
	<Tag
		className={composeRenderProps("", (className, renderProps) =>
			tagStyles({ ...renderProps, className }),
		)}
		id={String(category.id)}
		textValue={category.category_name}
	>
		{({ allowsRemoving }) => (
			<>
				<CollectionIcon
					bookmarkCategoryData={category}
					iconSize="8"
					size="12"
				/>

				<span className="max-w-[100px] truncate">{category.category_name}</span>

				{allowsRemoving && (
					<Button
						className="rounded-full p-0.5 hover:bg-white/20"
						slot="remove"
					>
						<LightboxCloseIcon className="size-2.5" />
					</Button>
				)}
			</>
		)}
	</Tag>
);

const listBoxItemStyles = tv({
	base: "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-[5px] text-13 leading-[15px] font-450 tracking-[0.01em] text-gray-900 outline-none select-none",
	variants: {
		isFocused: {
			true: "bg-gray-200",
		},
		isDisabled: {
			true: "opacity-50",
		},
	},
});

const boxStyles = tv({
	extend: checkboxBoxStyles,
	base: "size-4 rounded-[5px]",
	variants: {
		isSelected: {
			true: "bg-plain-reverse text-plain",
			false: "bg-plain-reverse text-plain-reverse",
		},
	},
});

type CategoryListBoxItemProps = {
	category: CategoriesData;
};

export const CategoryListBoxItem = ({ category }: CategoryListBoxItemProps) => (
	<ListBoxItem
		className={composeRenderProps("", (className, renderProps) =>
			listBoxItemStyles({ ...renderProps, className }),
		)}
		id={String(category.id)}
		textValue={category.category_name}
	>
		{({ isSelected }) => (
			<>
				<div className={boxStyles({ isSelected })}>
					<CheckIcon aria-hidden className="text-[10px]" />
				</div>

				<CollectionIcon
					bookmarkCategoryData={category}
					iconSize="10"
					size="16"
				/>

				<span className="truncate">{category.category_name}</span>
			</>
		)}
	</ListBoxItem>
);

type CategoryTagListProps = Pick<
	ComponentProps<typeof TagGroup>,
	"onRemove"
> & {
	selectedCategories: CategoriesData[];
};

export const CategoryTagList = ({
	onRemove,
	selectedCategories,
}: CategoryTagListProps) => (
	<TagGroup aria-label="Selected categories" onRemove={onRemove}>
		<TagList className="flex flex-wrap gap-1" items={selectedCategories}>
			{(category) => <CategoryTag category={category} />}
		</TagList>
	</TagGroup>
);
