import { useChangeDiscoverableOptimisticMutation } from "@/async/mutationHooks/bookmarks/useChangeDiscoverableOptimisticMutation";
import { Checkbox } from "@/components/ui/recollect/checkbox";

type DiscoverableCheckboxProps = {
	bookmarkId: number;
	isDiscoverable: boolean;
};

export const DiscoverableCheckbox = ({
	bookmarkId,
	isDiscoverable,
}: DiscoverableCheckboxProps) => {
	const { changeDiscoverableMutation } =
		useChangeDiscoverableOptimisticMutation();

	const handleCheckedChange = (checked: boolean) => {
		changeDiscoverableMutation.mutate({
			bookmark_id: bookmarkId,
			make_discoverable: checked,
		});
	};

	return (
		<div className="flex items-center gap-2 px-2 py-1.5">
			<Checkbox
				id={`discoverable-${bookmarkId}`}
				checked={isDiscoverable}
				onCheckedChange={handleCheckedChange}
				className="flex size-4 items-center justify-center rounded border-2 border-gray-400 data-checked:border-gray-800 data-checked:bg-gray-800 [&_svg]:text-white"
			/>
			<label
				htmlFor={`discoverable-${bookmarkId}`}
				className="cursor-pointer text-sm font-medium text-gray-800"
			>
				Make discoverable
			</label>
		</div>
	);
};
