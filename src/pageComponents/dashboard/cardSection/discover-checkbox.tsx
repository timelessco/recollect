import { useToggleDiscoverableOptimisticMutation } from "@/async/mutationHooks/bookmarks/useToggleDiscoverableOptimisticMutation";
import { Checkbox } from "@/components/ui/recollect/checkbox";

type DiscoverableCheckboxProps = {
	bookmarkId: number;
	isDiscoverable: boolean;
};

export const DiscoverCheckbox = ({
	bookmarkId,
	isDiscoverable,
}: DiscoverableCheckboxProps) => {
	const { toggleDiscoverableMutation } =
		useToggleDiscoverableOptimisticMutation();

	const handleCheckedChange = (checked: boolean) => {
		toggleDiscoverableMutation.mutate({
			bookmark_id: bookmarkId,
			make_discoverable: checked,
		});
	};

	return (
		<div className="flex items-center gap-2 px-2 py-1.5">
			<label
				htmlFor={`discover-checkbox-${bookmarkId}`}
				className="flex cursor-pointer items-center gap-2"
			>
				<Checkbox
					checked={isDiscoverable}
					onCheckedChange={handleCheckedChange}
					className="flex size-4 items-center justify-center rounded border-2 border-gray-400 data-checked:border-gray-800 data-checked:bg-gray-800 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-plain data-checked:[&_svg]:text-gray-200"
				/>
				<span className="text-sm font-medium text-gray-800">
					Make discoverable
				</span>
			</label>
		</div>
	);
};
